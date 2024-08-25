import { install } from "./install";
import { START } from "./util/route";
import { assert, warn } from "./util/warn";
import { inBrowser } from "./util/dom";
import { cleanPath } from "./util/path";
import { createMatcher } from "./create-matcher";
import { normalizeLocation } from "./util/location";
import { supportsPushState } from "./util/push-state";
import { handleScroll } from "./util/scroll";
import { isNavigationFailure, NavigationFailureType } from "./util/errors";

import { HashHistory } from "./history/hash";
import { HTML5History } from "./history/html5";
import { AbstractHistory } from "./history/abstract";

export default class VueRouter {
  constructor(options) {
    if (process.env.NODE_ENV !== "production") {
      warn(
        this instanceof VueRouter,
        `Router must be called with the new operator.`
      );
    }
    this.app = null;
    this.apps = [];
    this.options = options;
    this.beforeHooks = [];
    this.resolveHooks = [];
    this.afterHooks = [];
    this.matcher = createMatcher(options.routes || [], this);

    let mode = options.mode || "hash";
    this.fallback =
      mode === "history" && !supportsPushState && options.fallback !== false;
    if (this.fallback) {
      mode = "hash";
    }
    if (!inBrowser) {
      mode = "abstract";
    }
    this.mode = mode;

    switch (mode) {
      case "history":
        this.history = new HTML5History(this, options.base);
        break;
      case "hash":
        this.history = new HashHistory(this, options.base, this.fallback);
        break;
      case "abstract":
        this.history = new AbstractHistory(this, options.base);
        break;
      default:
        if (process.env.NODE_ENV !== "production") {
          assert(false, `invalid mode: ${mode}`);
        }
    }
  }

  match(raw, current, redirectedFrom) {
    return this.matcher.match(raw, current, redirectedFrom);
  }

  get currentRoute() {
    return this.history && this.history.current;
  }

  init(app /* Vue component instance */) {
    process.env.NODE_ENV !== "production" &&
      assert(
        install.installed,
        `not installed. Make sure to call \`Vue.use(VueRouter)\` ` +
          `before creating root instance.`
      );

    this.apps.push(app);

    // set up app destroyed handler
    // https://github.com/vuejs/vue-router/issues/2639
    app.$once("hook:destroyed", () => {
      // clean out app from this.apps array once destroyed
      const index = this.apps.indexOf(app);
      if (index > -1) this.apps.splice(index, 1);
      // ensure we still have a main app or null if no apps
      // we do not release the router so it can be reused
      if (this.app === app) this.app = this.apps[0] || null;

      if (!this.app) this.history.teardown();
    });

    // main app previously initialized
    // return as we don't need to set up new history listener
    if (this.app) {
      return;
    }

    this.app = app;

    const history = this.history;

    if (history instanceof HTML5History || history instanceof HashHistory) {
      const handleInitialScroll = (routeOrError) => {
        const from = history.current;
        const expectScroll = this.options.scrollBehavior;
        const supportsScroll = supportsPushState && expectScroll;

        if (supportsScroll && "fullPath" in routeOrError) {
          handleScroll(this, routeOrError, from, false);
        }
      };
      const setupListeners = (routeOrError) => {
        history.setupListeners();
        handleInitialScroll(routeOrError);
      };
      history.transitionTo(
        history.getCurrentLocation(),
        setupListeners,
        setupListeners
      );
    }

    history.listen((route) => {
      this.apps.forEach((app) => {
        app._route = route;
      });
    });
  }

  beforeEach(fn) {
    return registerHook(this.beforeHooks, fn);
  }

  beforeResolve(fn) {
    return registerHook(this.resolveHooks, fn);
  }

  afterEach(fn) {
    return registerHook(this.afterHooks, fn);
  }

  onReady(cb, errorCb) {
    this.history.onReady(cb, errorCb);
  }

  onError(errorCb) {
    this.history.onError(errorCb);
  }

  push(location, onComplete, onAbort) {
    // $flow-disable-line
    if (!onComplete && !onAbort && typeof Promise !== "undefined") {
      return new Promise((resolve, reject) => {
        this.history.push(location, resolve, reject);
      });
    } else {
      this.history.push(location, onComplete, onAbort);
    }
  }

  replace(location, onComplete, onAbort) {
    if (!onComplete && !onAbort && typeof Promise !== "undefined") {
      return new Promise((resolve, reject) => {
        this.history.replace(location, resolve, reject);
      });
    } else {
      this.history.replace(location, onComplete, onAbort);
    }
  }

  go(n) {
    this.history.go(n);
  }

  back() {
    this.go(-1);
  }

  forward() {
    this.go(1);
  }

  getMatchedComponents(to) {
    const route = to
      ? to.matched
        ? to
        : this.resolve(to).route
      : this.currentRoute;
    if (!route) {
      return [];
    }
    return [].concat.apply(
      [],
      route.matched.map((m) => {
        return Object.keys(m.components).map((key) => {
          return m.components[key];
        });
      })
    );
  }

  resolve(to, current, append) {
    current = current || this.history.current;
    const location = normalizeLocation(to, current, append, this);
    const route = this.match(location, current);
    const fullPath = route.redirectedFrom || route.fullPath;
    const base = this.history.base;
    const href = createHref(base, fullPath, this.mode);
    return {
      location,
      route,
      href,
      // for backwards compat
      normalizedTo: location,
      resolved: route,
    };
  }

  getRoutes() {
    return this.matcher.getRoutes();
  }

  addRoute(parentOrRoute, route) {
    this.matcher.addRoute(parentOrRoute, route);
    if (this.history.current !== START) {
      this.history.transitionTo(this.history.getCurrentLocation());
    }
  }

  addRoutes(routes) {
    if (process.env.NODE_ENV !== "production") {
      warn(
        false,
        "router.addRoutes() is deprecated and has been removed in Vue Router 4. Use router.addRoute() instead."
      );
    }
    this.matcher.addRoutes(routes);
    if (this.history.current !== START) {
      this.history.transitionTo(this.history.getCurrentLocation());
    }
  }
}

function registerHook(list, fn) {
  list.push(fn);
  return () => {
    const i = list.indexOf(fn);
    if (i > -1) list.splice(i, 1);
  };
}

function createHref(base, fullPath, mode) {
  const path = mode === "hash" ? "#" + fullPath : fullPath;
  return base ? cleanPath(base + "/" + path) : path;
}

// We cannot remove this as it would be a breaking change
VueRouter.install = install;
VueRouter.version = "__VERSION__";
VueRouter.isNavigationFailure = isNavigationFailure;
VueRouter.NavigationFailureType = NavigationFailureType;
VueRouter.START_LOCATION = START;
