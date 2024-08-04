const { defineConfig } = require("@vue/cli-service");
const path = require("node:path");

module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    resolve: {
      // extension:[], //内部已默认配置
      alias: {
        // vue: path.resolve(
        //   __dirname,
        //   "vue/src/platforms/web/entry-runtime-with-compiler-esm.ts"
        // ),
        vue$: path.resolve(__dirname, "./vue/dist/vue.runtime.esm.js"),
      },
    },
  },
});
