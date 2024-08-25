<template>
  <div id="app">
    <h1>app</h1>
    <router-view />
    <!--    <User-->
    <!--      :name="username"-->
    <!--      :gender="userGender"-->
    <!--      :avatar="userAvatar"-->
    <!--      @click.native="changeName"-->
    <!--    ></User>-->
  </div>
</template>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

nav {
  padding: 30px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>
<script>
let num = 0;
// import User from "@/components/user.vue";
export default {
  name: "App",
  components: {
    // User,
  },
  data() {
    return {
      username: "MirrorXu",
      userGender: 2,
      userAvatar:
        "https://cdn.pixabay.com/photo/2021/07/19/04/36/woman-6477171_1280.jpg",
    };
  },
  methods: {
    changeName() {
      this.username = this.username + Number(++num);
    },
  },
};
</script>
