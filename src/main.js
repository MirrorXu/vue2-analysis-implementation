import Vue from "vue";
import App from "./App.vue";
import router from "./router";
// import store from "./store";
import "../async";
console.log(App);
Vue.config.productionTip = false;

const app = new Vue({
  router,
  // store,
  data() {
    return {
      id: "Blag for root app",
    };
  },
  render: (h) => {
    const vnode = h(App);
    return vnode;
  },
});

app.$mount("#app");
