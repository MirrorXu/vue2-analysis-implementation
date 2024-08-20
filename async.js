console.log("start");

async function async1() {
  console.log("async1-start");
  const async2Ret = await async2();
  console.log(async2Ret);
  const async3Ret = await async3();
  console.log(async3Ret);
  console.log("async1-end");
  return "a";
}

async function async2() {
  console.log("async2");
  return "async2-ret";
}

async function async3() {
  console.log("async3");
  return "async3-ret";
}

setTimeout(function () {
  console.log("setTimeout");
}, 0);

const p = () => {
  return new Promise((resolve) => {
    console.log("Promise");
    resolve();
  })
    .then(function () {
      console.log("promise1");
    })
    .then(function () {
      console.log("promise2");
      return "p";
    });
};

async function doAsync() {
  const a = await async1();
  console.log(a);
  const b = await p();
  console.log(a, b);
}

doAsync();
console.log("end");

// sync:  start async1-start  async2  end
// async:
// mic: async2-ret  async3 async3-ret async1-end a   Promise promise1 promise2  [a , p]
// mac: setTimeout
