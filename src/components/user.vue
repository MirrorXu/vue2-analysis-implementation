<script>
export default {
  name: "UserId",
  props: {
    name: {
      type: String,
      default: "",
      // required: true,
    },
    gender: {
      type: Number,
      required: false,
    },
    avatar: {
      type: String,
      required: false,
    },
  },
  computed: {
    c_gender() {
      const { gender } = this;
      return gender > 1 ? "男" : "女";
    },
  },

  data() {
    return {
      id: "",
    };
  },
  mounted() {
    console.log(this.$route);
    this.id = this.$route.params.id;
  },
  methods: {
    handlePush() {
      debugger;
      this.$router.push({ path: "/about" });
    },
  },
};
</script>

<template>
  <div class="User">
    {{ id }}
    <div>{{ name }}</div>
    <div v-if="gender">{{ c_gender }}</div>
    <img v-if="avatar" :src="avatar" alt="用户头像" />
    <button @click="handlePush">跳转到/about</button>
  </div>
</template>

<style scoped lang="scss">
.User {
  user-select: none;
  display: flex;
  flex-direction: column;
  border: 1px solid red;
  text-align: left;
  width: 200px;
  > div {
    padding: 20px;
  }
  img {
    height: 30px;
    width: 30px;
    border-radius: 50%;
  }
}
</style>
