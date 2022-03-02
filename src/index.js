// 新建 index.js

// 引入我们的 MyPromise.js
import MyPromise from "./MyPromise.js"
console.log(MyPromise.resolve(2).finally(() => {})
) 