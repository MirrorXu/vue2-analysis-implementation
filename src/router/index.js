import Vue from "vue";
import VueRouter from "vue-router";
import HomeView from "../views/HomeView.vue";

Vue.use(VueRouter);

const routes = [
  {
    path: "/",
    name: "home",
    component: HomeView,
    redirect: { name: "userDetail", params: { id: 345564 } },
  },
  {
    path: "/about",
    name: "about",
    component: () =>
      import(/* webpackChunkName: "about" */ "../views/AboutView.vue"),
    beforeEnter: function about_beforeEnter(to, from, next) {
      console.log("about_beforeEnter", to, from);
      next((vm) => {
        console.log("about_beforeEnter  next:", vm);
      });
    },
  },
  {
    path: "/user",
    name: "user",
    component: () => import(/* webpackChunkName: "user" */ "../views/User.vue"),
    redirect: "/user/123",
    children: [
      {
        path: ":id",
        name: "userDetail",
        component: () =>
          import(/* webpackChunkName: "user" */ "../components/user.vue"),
      },
    ],
  },
];

const router = new VueRouter({
  // mode: "history",
  mode: "hash",
  base: process.env.BASE_URL,
  routes,
});
const m_routerBeforeEach = (to, from, next) => {
  console.log("m_routerBeforeEach:", to, from);
  next();
};
const m_routerAfterEach = (to, from) => {
  console.log("m_routerAfterEach", to, from);
};
router.beforeEach(m_routerBeforeEach);
router.afterEach(m_routerAfterEach);
export default router;
