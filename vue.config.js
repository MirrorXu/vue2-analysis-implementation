const { defineConfig } = require("@vue/cli-service");
const path = require("path");
const resolve = (p) => path.resolve(__dirname, p);
module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    resolve: {
      alias: {
        vue$: resolve("./vue/dist/vue.runtime.esm.js"),
        "vue-router$": resolve("./vue-router/dist/vue-router.esm.js"),
      },
      // alias: {
      //   vue$: path.resolve(__dirname, "vue/src/platforms/web/entry-runtime.ts"),
      //   runtime: path.resolve(__dirname, "vue/src/platforms/web/runtime"),
      //   shared: path.resolve(__dirname, "vue/src/shared"),
      //   v3: path.resolve(__dirname, "vue/src/v3"),
      // },
    },
  },
});
