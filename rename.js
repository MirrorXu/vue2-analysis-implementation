const path = require("path");
const fs = require("fs");
const resove = (p) => path.resolve(__dirname, p);
const dir = resove("./vue-router/src");
const files = fs.readdirSync(dir);
// console.log(files);

files.forEach((fileName) => {
  // console.log(fileName);
  if (fileName.endsWith(".js")) {
    console.log(fileName);
    const filePath = resove(dir + "/" + fileName);
    const pathChunks = filePath.split(".");
    pathChunks[pathChunks.length - 1] = "ts";
    const newFilePath = pathChunks.join(".");
    console.log(newFilePath);
    fs.rename(filePath, newFilePath, (e) => {
      throw e;
    });
  }
});
