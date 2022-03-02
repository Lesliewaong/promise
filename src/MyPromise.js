// 新建 MyPromise.js

// 定义三个常量表示状态
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';
// 新建 MyPromise 类
export default class MyPromise {

    // 公共字段存储状态和结果变量
    // 储存状态的变量，初始值是pending
    status = PENDING;
    // 成功之后的值
    value = null;
    // 失败之后的原因
    reason = null;
    // 存储成功回调函数
    onFulfilledCallbacks = [];
    // 存储失败回调函数
    onRejectedCallbacks = [];

    constructor(executor) {
        // resolve和reject为什么要用箭头函数？
        // 如果直接调用的话，普通函数resolve和reject内部this指向的是undefined
        // 用箭头函数就可以让this指向当前实例对象
        // 更改成功后的状态
        const resolve = (value) => {
            // 只有状态是等待，才执行状态修改
            if (this.status === PENDING) {
                this.status = FULFILLED;// 状态修改为成功
                this.value = value;// 保存成功之后的值
                // resolve里面将所有成功的回调拿出来执行
                while (this.onFulfilledCallbacks.length) {
                    // Array.shift() 取出数组第一个元素，然后（）调用，shift不是纯函数，取出后，数组将失去该元素，直到数组为空
                    this.onFulfilledCallbacks.shift()(value)
                }

            }

        }
        // 更改失败后的状态
        const reject = (reason) => {
            // 只有状态是等待，才执行状态修改
            if (this.status === PENDING) {
                this.status = REJECTED;// 状态修改为成功
                this.reason = reason;// 保存失败后的原因
                // reject里面将所有失败的回调拿出来执行
                while (this.onRejectedCallbacks.length) {
                    this.onRejectedCallbacks.shift()(reason);
                }
            }

        }
        // executor 是一个执行器，进入会立即执行
        // 并传入resolve和reject方法
        try {
            executor(resolve, reject);
        } catch (error) {
            // 如果有错误，就直接执行reject
            reject(error)
        }
    }

    then(onFulfilled, onRejected) {
        // 如果不传，就使用默认函数
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value;
        onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason };

        // 为了链式调用这里直接创建一个MyPromise，并在后面return出去
        // promise有暂时性死区，初始化之后才能使用
        const promise = new MyPromise((resolve, reject) => {
            // 这里的内容在执行器中，会立即执行
            if (this.status === FULFILLED) {
                // 创建一个微任务等待 promise 完成初始化
                queueMicrotask(() => {
                    try {
                        // 获取成功回调函数的执行结果
                        const result = onFulfilled(this.value);
                        // 传入 resolvePromise 集中处理
                        resolvePromise(promise, result, resolve, reject);
                    } catch (error) {
                        reject(error)
                    }

                })
            } else if (this.status === REJECTED) {
                // 调用失败回调，并且把原因返回
                queueMicrotask(() => {
                    try {
                        const result = onRejected(this.reason);
                        resolvePromise(promise, result, resolve, reject);
                    } catch (error) {
                        reject(error);
                    }
                })

            } else if (this.status === PENDING) {
                // 因为不知道后面状态的变化情况，所以将成功回调和失败回调存储起来
                // 等到执行成功失败函数的时候再传递
                this.onFulfilledCallbacks.push(() => {
                    queueMicrotask(() => {
                        try {
                            const result = onFulfilled(this.value);
                            resolvePromise(promise, result, resolve, reject);
                        } catch (error) {
                            reject(error);
                        }
                    })
                });
                this.onRejectedCallbacks.push(() => {
                    queueMicrotask(() => {
                        try {
                            const result = onRejected(this.reason);
                            resolvePromise(promise, result, resolve, reject);
                        } catch (error) {
                            reject(error);
                        }
                    })
                });
            }
            // 封装一个函数统一处理回调函数的执行结果 
            function resolvePromise(promise, result, resolve, reject) {
                // 如果相等了，说明return的是自己，抛出类型错误并返回
                if (promise === result) {
                    return reject(new TypeError('Chaining cycle detected for promise #<Promise>'))
                }

                // 判断result是不是 MyPromise 实例对象
                if (result instanceof MyPromise) {
                    // 执行 result，调用 then 方法，目的是将其状态变为 fulfilled 或者 rejected
                    // result.then(value => resolve(value), reason => reject(reason))
                    // 简化之后
                    result.then(resolve, reject);
                } else {
                    // 普通值
                    resolve(result);
                }
            }


        })
        return promise;
    }
    // catch方法其实就是执行一下then的第二个回调
    catch(onRejected) {
        return this.then(undefined, onRejected);
    }
    // resolve 静态方法
    static resolve(value) {
        // 如果这个值是一个 promise ，那么将返回这个 promise 
        if (value instanceof MyPromise) {
            return value;
        }

        // 否则返回的promise将以此值完成。
        return new MyPromise(resolve => {
            resolve(value);
        });

    }

    // reject 静态方法
    static reject(reason) {
        return new MyPromise((resolve, reject) => {
            reject(reason);
        });
    }
    //all 静态方法
    static all(promiseArr) {
        let index = 0;//记录resolve次数
        let result = [];// 输入的所有promise的resolve回调的结果
        return new MyPromise((resolve, reject) => {
            promiseArr.forEach((p, i) => {
                //Promise.resolve(p)用于处理传入值不为Promise的情况
                MyPromise.resolve(p).then(
                    val => {
                        index++;
                        result[i] = val;
                        //所有then执行后, resolve结果,结果为一个数组
                        if (index === promiseArr.length) {
                            resolve(result);
                        }
                    },
                    err => {
                        //有一个Promise被reject时，MyPromise的状态变为reject
                        reject(err)
                    }
                )
            })
        })
    }
    static race(promiseArr) {
        return new MyPromise((resolve, reject) => {
            //同时执行Promise,如果有一个Promise的状态发生改变,就变更新MyPromise的状态
            for (let p of promiseArr) {
                //Promise.resolve(p)用于处理传入值不为Promise的情况
                MyPromise.resolve(p).then(resolve, reject);
            }
        })
    }
    //finally方法
    finally(callback) {
        return this.then(
            // MyPromise.resolve执行回调,并在then中return结果传递给后面的Promise
            value => MyPromise.resolve(callback()).then(() => value),    
            // reject同理         
            reason => MyPromise.resolve(callback()).then(() => { throw reason })  
        )
    }
    //allSettled方法
    static allSettled(promises) {
        if (promises.length === 0) return MyPromise.resolve([])

        return new MyPromise((resolve, reject) => {
            const result = []; //输入的所有promise的resolve回调的结果
            let count = promises.length;

            promises.forEach((promise, index) => {
                MyPromise.resolve(promise).then((value) => {
                    result[index] = {
                        status: 'fulfilled',
                        value
                    }
                    count--;
                    // resolve after all are settled
                    if (count === 0) {
                        resolve(result)
                    }
                }, (reason) => {
                    result[index] = {
                        status: 'rejected',
                        reason
                    }
                    count--;
                    // resolve after all are settled
                    if (count === 0) {
                        resolve(result)
                    }
                })
            })
        })
    }



}
