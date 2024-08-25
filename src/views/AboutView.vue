<template>
  <div class="about">
    <h1>This is an about page</h1>
  </div>
</template>
<script>
export default {
  name: "AboutView",
  beforeRouteEnter(to, from, next) {
    debugger;
    console.log(to);
    console.log(from);
    console.log(next);
    next((vm) => {
      console.log(vm);
    });
  },
};
</script>
