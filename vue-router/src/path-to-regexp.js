const DEFAULT_DELIMITER = "/";
const NOOP_VALUE = (value) => value;
const ID_CHAR = /^\p{XID_Continue}$/u;
const DEBUG_URL = "https://git.new/pathToRegexpError";
const SIMPLE_TOKENS = {
  "!": "!",
  "@": "@",
  ";": ";",
  ",": ",",
  "*": "*",
  "+": "+",
  "?": "?",
  "{": "{",
  "}": "}",
};
/**
 * Tokenize input string.
 */
function lexer(str) {
  const chars = [...str];
  const tokens = [];
  let i = 0;
  while (i < chars.length) {
    const value = chars[i];
    const type = SIMPLE_TOKENS[value];
    if (type) {
      tokens.push({ type, index: i++, value });
      continue;
    }
    if (value === "\\") {
      tokens.push({ type: "ESCAPED", index: i++, value: chars[i++] });
      continue;
    }
    if (value === ":") {
      let name = "";
      while (ID_CHAR.test(chars[++i])) {
        name += chars[i];
      }
      if (!name) {
        throw new TypeError(`Missing parameter name at ${i}`);
      }
      tokens.push({ type: "NAME", index: i, value: name });
      continue;
    }
    if (value === "(") {
      const pos = i++;
      let count = 1;
      let pattern = "";
      if (chars[i] === "?") {
        throw new TypeError(`Pattern cannot start with "?" at ${i}`);
      }
      while (i < chars.length) {
        if (chars[i] === "\\") {
          pattern += chars[i++] + chars[i++];
          continue;
        }
        if (chars[i] === ")") {
          count--;
          if (count === 0) {
            i++;
            break;
          }
        } else if (chars[i] === "(") {
          count++;
          if (chars[i + 1] !== "?") {
            throw new TypeError(`Capturing groups are not allowed at ${i}`);
          }
        }
        pattern += chars[i++];
      }
      if (count) throw new TypeError(`Unbalanced pattern at ${pos}`);
      if (!pattern) throw new TypeError(`Missing pattern at ${pos}`);
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: chars[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return new Iter(tokens);
}
class Iter {
  constructor(tokens) {
    this.tokens = tokens;
    this.index = 0;
  }
  peek() {
    return this.tokens[this.index];
  }
  tryConsume(type) {
    const token = this.peek();
    if (token.type !== type) return;
    this.index++;
    return token.value;
  }
  consume(type) {
    const value = this.tryConsume(type);
    if (value !== undefined) return value;
    const { type: nextType, index } = this.peek();
    throw new TypeError(
      `Unexpected ${nextType} at ${index}, expected ${type}: ${DEBUG_URL}`
    );
  }
  text() {
    let result = "";
    let value;
    while ((value = this.tryConsume("CHAR") || this.tryConsume("ESCAPED"))) {
      result += value;
    }
    return result;
  }
  modifier() {
    return this.tryConsume("?") || this.tryConsume("*") || this.tryConsume("+");
  }
}
/**
 * Tokenized path instance. Can we passed around instead of string.
 */
export class TokenData {
  constructor(tokens, delimiter) {
    this.tokens = tokens;
    this.delimiter = delimiter;
  }
}
/**
 * Parse a string for the raw tokens.
 */
export function parse(str, options = {}) {
  const { encodePath = NOOP_VALUE, delimiter = encodePath(DEFAULT_DELIMITER) } =
    options;
  const tokens = [];
  const it = lexer(str);
  let key = 0;
  do {
    const path = it.text();
    if (path) tokens.push(encodePath(path));
    const name = it.tryConsume("NAME");
    const pattern = it.tryConsume("PATTERN");
    if (name || pattern) {
      tokens.push({
        name: name || String(key++),
        pattern,
      });
      const next = it.peek();
      if (next.type === "*") {
        throw new TypeError(
          `Unexpected * at ${next.index}, you probably want \`/*\` or \`{/:foo}*\`: ${DEBUG_URL}`
        );
      }
      continue;
    }
    const asterisk = it.tryConsume("*");
    if (asterisk) {
      tokens.push({
        name: String(key++),
        pattern: `(?:(?!${escape(delimiter)}).)*`,
        modifier: "*",
        separator: delimiter,
      });
      continue;
    }
    const open = it.tryConsume("{");
    if (open) {
      const prefix = it.text();
      const name = it.tryConsume("NAME");
      const pattern = it.tryConsume("PATTERN");
      const suffix = it.text();
      const separator = it.tryConsume(";") && it.text();
      it.consume("}");
      const modifier = it.modifier();
      tokens.push({
        name: name || (pattern ? String(key++) : ""),
        prefix: encodePath(prefix),
        suffix: encodePath(suffix),
        pattern,
        modifier,
        separator,
      });
      continue;
    }
    it.consume("END");
    break;
  } while (true);
  return new TokenData(tokens, delimiter);
}
/**
 * Compile a string to a template function for the path.
 */
export function compile(path, options = {}) {
  const data = path instanceof TokenData ? path : parse(path, options);
  return compileTokens(data, options);
}
/**
 * Convert a single token into a path building function.
 */
function tokenToFunction(token, encode) {
  if (typeof token === "string") {
    return () => token;
  }
  const encodeValue = encode || NOOP_VALUE;
  const repeated = token.modifier === "+" || token.modifier === "*";
  const optional = token.modifier === "?" || token.modifier === "*";
  const { prefix = "", suffix = "", separator = suffix + prefix } = token;
  if (encode && repeated) {
    const stringify = (value, index) => {
      if (typeof value !== "string") {
        throw new TypeError(`Expected "${token.name}/${index}" to be a string`);
      }
      return encodeValue(value);
    };
    const compile = (value) => {
      if (!Array.isArray(value)) {
        throw new TypeError(`Expected "${token.name}" to be an array`);
      }
      if (value.length === 0) return "";
      return prefix + value.map(stringify).join(separator) + suffix;
    };
    if (optional) {
      return (data) => {
        const value = data[token.name];
        if (value == null) return "";
        return value.length ? compile(value) : "";
      };
    }
    return (data) => {
      const value = data[token.name];
      return compile(value);
    };
  }
  const stringify = (value) => {
    if (typeof value !== "string") {
      throw new TypeError(`Expected "${token.name}" to be a string`);
    }
    return prefix + encodeValue(value) + suffix;
  };
  if (optional) {
    return (data) => {
      const value = data[token.name];
      if (value == null) return "";
      return stringify(value);
    };
  }
  return (data) => {
    const value = data[token.name];
    return stringify(value);
  };
}
/**
 * Transform tokens into a path building function.
 */
function compileTokens(data, options) {
  const {
    encode = encodeURIComponent,
    loose = true,
    validate = true,
    strict = false,
  } = options;
  const flags = toFlags(options);
  const stringify = toStringify(loose, data.delimiter);
  const sources = toRegExpSource(data, stringify, [], flags, strict);
  // Compile all the tokens into regexps.
  const encoders = data.tokens.map((token, index) => {
    const fn = tokenToFunction(token, encode);
    if (!validate || typeof token === "string") return fn;
    const validRe = new RegExp(`^${sources[index]}$`, flags);
    return (data) => {
      const value = fn(data);
      if (!validRe.test(value)) {
        throw new TypeError(
          `Invalid value for "${token.name}": ${JSON.stringify(value)}`
        );
      }
      return value;
    };
  });
  return function path(data = {}) {
    let path = "";
    for (const encoder of encoders) path += encoder(data);
    return path;
  };
}
/**
 * Create path match function from `path-to-regexp` spec.
 */
export function match(path, options = {}) {
  const { decode = decodeURIComponent, loose = true } = options;
  const data = path instanceof TokenData ? path : parse(path, options);
  const stringify = toStringify(loose, data.delimiter);
  const keys = [];
  const re = tokensToRegexp(data, keys, options);
  const decoders = keys.map((key) => {
    if (decode && (key.modifier === "+" || key.modifier === "*")) {
      const { prefix = "", suffix = "", separator = suffix + prefix } = key;
      const re = new RegExp(stringify(separator), "g");
      return (value) => value.split(re).map(decode);
    }
    return decode || NOOP_VALUE;
  });
  return function match(input) {
    const m = re.exec(input);
    if (!m) return false;
    const { 0: path, index } = m;
    const params = Object.create(null);
    for (let i = 1; i < m.length; i++) {
      if (m[i] === undefined) continue;
      const key = keys[i - 1];
      const decoder = decoders[i - 1];
      params[key.name] = decoder(m[i]);
    }
    return { path, index, params };
  };
}
/**
 * Escape a regular expression string.
 */
function escape(str) {
  return str.replace(/([.+*?^${}()[\]|/\\])/g, "\\$1");
}
/**
 * Escape and repeat loose characters for regular expressions.
 */
function looseReplacer(value, loose) {
  const escaped = escape(value);
  return loose ? `(?:${escaped})+(?!${escaped})` : escaped;
}
/**
 * Encode all non-delimiter characters using the encode function.
 */
function toStringify(loose, delimiter) {
  if (!loose) return escape;
  const re = new RegExp(`(?:(?!${escape(delimiter)}).)+|(.)`, "g");
  return (value) => value.replace(re, looseReplacer);
}
/**
 * Get the flags for a regexp from the options.
 */
function toFlags(options) {
  return options.sensitive ? "" : "i";
}
/**
 * Expose a function for taking tokens and returning a RegExp.
 */
function tokensToRegexp(data, keys, options) {
  const {
    trailing = true,
    loose = true,
    start = true,
    end = true,
    strict = false,
  } = options;
  const flags = toFlags(options);
  const stringify = toStringify(loose, data.delimiter);
  const sources = toRegExpSource(data, stringify, keys, flags, strict);
  let pattern = start ? "^" : "";
  pattern += sources.join("");
  if (trailing) pattern += `(?:${stringify(data.delimiter)})?`;
  pattern += end ? "$" : `(?=${escape(data.delimiter)}|$)`;
  return new RegExp(pattern, flags);
}
/**
 * Convert a token into a regexp string (re-used for path validation).
 */
function toRegExpSource(data, stringify, keys, flags, strict) {
  const defaultPattern = `(?:(?!${escape(data.delimiter)}).)+?`;
  let backtrack = "";
  let safe = true;
  return data.tokens.map((token, index) => {
    if (typeof token === "string") {
      backtrack = token;
      return stringify(token);
    }
    const {
      prefix = "",
      suffix = "",
      separator = suffix + prefix,
      modifier = "",
    } = token;
    const pre = stringify(prefix);
    const post = stringify(suffix);
    if (token.name) {
      const pattern = token.pattern ? `(?:${token.pattern})` : defaultPattern;
      const re = checkPattern(pattern, token.name, flags);
      safe || (safe = safePattern(re, prefix || backtrack));
      if (!safe) {
        throw new TypeError(
          `Ambiguous pattern for "${token.name}": ${DEBUG_URL}`
        );
      }
      safe = !strict || safePattern(re, suffix);
      backtrack = "";
      keys.push(token);
      if (modifier === "+" || modifier === "*") {
        const mod = modifier === "*" ? "?" : "";
        const sep = stringify(separator);
        if (!sep) {
          throw new TypeError(
            `Missing separator for "${token.name}": ${DEBUG_URL}`
          );
        }
        safe || (safe = !strict || safePattern(re, separator));
        if (!safe) {
          throw new TypeError(
            `Ambiguous pattern for "${token.name}" separator: ${DEBUG_URL}`
          );
        }
        safe = !strict;
        return `(?:${pre}(${pattern}(?:${sep}${pattern})*)${post})${mod}`;
      }
      return `(?:${pre}(${pattern})${post})${modifier}`;
    }
    return `(?:${pre}${post})${modifier}`;
  });
}
function checkPattern(pattern, name, flags) {
  try {
    return new RegExp(`^${pattern}$`, flags);
  } catch (err) {
    throw new TypeError(`Invalid pattern for "${name}": ${err.message}`);
  }
}
function safePattern(re, value) {
  return value ? !re.test(value) : false;
}
/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 */
export function pathToRegexp(path, options = {}) {
  const data = path instanceof TokenData ? path : parse(path, options);
  const keys = [];
  const regexp = tokensToRegexp(data, keys, options);
  return Object.assign(regexp, { keys });
}
