## 入口函数 index.ts

```ts
export { createPinia } from "./createPinia";
export { defineStore } from "./defineStore";
```

pinia源码中充分使用了ts的类型推断，下面简化的源码只实现了核心逻辑。

pinia中废弃了mutations中操作state，vuex的mutations为了提升状态的可追踪性和可维护性。方便测试和调试。

## createPinia

返回一个带 install 方法的对象，在 install 的时候向全局暴露出 pinia 对象（vue2 和 vue3 组件，甚至不是组件也都能使用），这个对象里存放了所有 store 的\_stores 属性，用来停止所有 state 响应式的\_e 属性，存放所有 state 的 state 属性，插件列表和 install 注册函数。

在 install 方法中，vuex 采用原型链挂载 store，pinia 则采用 provide/inject 和 config.globalProterties 挂载 store。原因：原型链机制可能会导致 ts 的类型推断出问题。

```ts
import { ref, effectScope } from "vue";
import { piniaSymbol } from "./piniaSymbol";
// 定义activePinia全局变量，存放piniaStore。相比vuex的store在beforeCreate时被挂载到vue的原型对象上，不在vue组件也能访问到piniaStore（router）
export let activePinia;
export const setActivePinia = (piniaStore) => (activePinia = piniaStore);
// 返回一个带install方法的对象，用于vue注册pinia插件
export function createPinia() {
  // effectScope用于创建一个effect作用域，run方法捕获其中创建的响应式副作用，包括计算属性和侦听器，stop方法可以销毁所有的副作用
  const scope = effectScope(true);
  // 创建一个响应式的空对象，存储到pinia实例的state中。传入的函数会在effectScope的作用域内执行。方便后续通过stop方法停止响应式。
  const state = scope.run(() => ref({}));
  // 存放所有插件
  const _plugins = [];
  const piniaStore = {
    // 提供给外界用于注册插件
    use(plugin) {
      _plugins.push(plugin);
      return this; // 返回this方便链式调用
    },
    _plugins,
    _stores: new Map(), // 存放所有store，Map对象统一管理
    _e: scope, // pinia实例对象的effect scope，可用stop方法来终止当前实例的所有effect
    state,
    install(app) {
      setActivePinia(piniaStore); // 将piniaStore暴露到全局
      app.provide(piniaSymbol, piniaStore); // provide/inject vue3新特性，所有组件通过component.inject(piniaSymbol)能访问到piniaStore
      app.config.globalProperties.$pinia = piniaStore; // vue2的组件实例也能共享piniaStore
    },
  };
  return piniaStore;
}
```

## defineStore

全局创建并注册 pinia 实例后，需要定义 store

defineStore 接受三种参数：

- 传入 id + options
- 只传入 options（id 包含在 options）
- 传入 id + setup 函数

+ id: 定义store的唯一id，单独传参或者通过options.id进行传参
+ options：如果传参是对象，则可以传，state，getters，action，id，例如上图1 2 种声明方式；如果传参是Function，则自主声明变量方法，例如上图第三种声明方式
+ storeSetup：仅限第三种store的声明方式，传入函数

<img src="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/28fe3857f42143a58a4341b8742f5321~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp">

```ts
import { piniaSymbol } from './piniaSymbol'
import { getCurrentInstance, inject, reactive, effectScope, isRef, isReactive } from 'vue'
import { activePinia, setActivePinia } from './createPinia'

/**
 * defineStore接受三种传参方式: （感觉传入options就是为了迎合vue2的写法）
 * 第一种是传入id + options。
 * 第二种是只传入options（id也包含在这里面）
 * 第三种是传入id + setup函数
 */
export function defineStore(idOrOptions, optionsOrSetup) {
  let id, options
  // 处理第一个参数 id/options
  if (typeof idOrOptions === 'string') { // 第一种传参方式
    id = idOrOptions
    options = optionsOrSetup
  } else { // 第二种传参方式
    options = idOrOptions
    id = options.id
  }

  function useStore() {
    // vue3新特性，获取当前组件实例
    const instance = getCurrentInstance()
    // 接下来通过inject(piniaSymbol)获取pinia实例（在install阶段保存）。
    let piniaStore = instance && inject(piniaSymbol)
    // store已注册
    if (piniaStore) {
      setActivePinia(piniaStore)
    }
    // 即使不是组件中，也可以访问piniaStore，并断言pinia一定存在（前面找不到pinia会报错的逻辑省略了）
    piniaStore = activePinia！
    // 第一次使用useStore，根据option创建store。后续使用时调useStore时跳过。
    // 单例模式，
    if (!piniaStore._stores.has(id)) {
      // 传进来一个setup函数 ，是第三种传参方式
      if (typeof optionsOrSetup === 'function') {
        createSetupStore(id, optionsOrSetup, piniaStore)
      } else { //前两种传参方式都用这个来构建store
        createOptionsStore(id, options, piniaStore)
      }
    }
    return piniaStore._stores.get(id)
  }
  // 用户调用就能获取store
  return useStore
}
~~~
```

<img src="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f9552eef800c448d8f47872730081697~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp">

### createOptionStore

defineStore的第二个参数使用非Function进行声明将会走入该逻辑。

~~~ts
function createOptionsStore(id, options,piniaStore) {
  const { state, actions, getters } = options

  function setup() { //处理store里的state、actions、getters
    piniaStore.state.value[id] = state ? state() : {} //把这个store的state存到piniaStore里
    const localState = toRefs(piniaStore.state.value[id]) //把这个store的state转换成ref即变成响应式，因为options写法里的state并不是响应式的。
    return Object.assign( //这里返回的对象就是用户存放用户定义的属性和方法
      localState, //用户的state
      actions, // 用户的actions
      // 使用数组的reduce API，初始值为{}，最后返回的是一个obj，里面将getter中属性一个个抓华为计算属性。
      Object.keys(getters || {}).reduce((memo, name) => { //用户的getters，因为用户的getters这个对象里的属性都是函数，所以我要把这些函数都执行了变成计算属性
        memo[name] = computed(() => {
          let store = pinia._stores.get(id)
          return getters[name].call(store)
        })//call是为了保证this指向store
    },{}))
  }

   // 使用createSetupStore创建store
  store = createSetupStore(id, setup, options, pinia, hot, true);
  
  // 重写$store方法
  store.$reset = function $reset() {
    const newState = state ? state() : {};
    // 我们使用补丁将所有更改分组到一个订阅中
    this.$patch(($state) => {
      assign($state, newState);
    });
  };
  return store as any;
}
~~~

### createSetupStore

无论是传入对象还是函数，最后都会通过createSetupStore，处理state、getters和ction，最后转化为setup函数。

<img src="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/44f6001afa144c29a7b04971a18aa958~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp">

~~~ts
function isComputed(v) { // 计算属性是ref，同时也是一个effect
  return !!(isRef(v)&&v.effect)
}

/**defineStore传入了setup函数时调用这个函数
 * id 表示store的id
 * setup表示setup函数
 * piniaStore表示整个pinia的store
 * isOption表示用户是否用option语法define的store
*/
function createSetupStore(id, setup, piniaStore,isOption) {
  let scope
  function $patch(){}
  const partialStore = {//内置的api存放到这个store里
    $patch
  }
  const store = reactive(partialStore) //store就是一个响应式对象，这个是最后暴露出去的store，会存放内置的api和用户定义的store

  if (!piniaStore.state.value[id] && !isOption) { // 整个pinia的store里还没有存放过目前这个state 且 用户用options语法来define的store
    piniaStore.state.value[id] = {}
  }

  //这个函数就是为了到时候方便停止响应式。（核心的创建store可以不要这部分代码）
  const setupStore = piniaStore._e.run(() => { //这样包一层就可以到时候通过pinia.store.stop()来停止全部store的响应式
    scope = effectScope()
    return scope.run(()=>setup()) //这样包一层就可以到时候通过scope.stop()来停止这个store的响应式
  })

  //遍历这个store里的所有属性，做进一步处理
  for (let key in setupStore) {
    const prop = setupStore[key]

     //处理action
    if (typeof prop == 'function') {
      setupStore[key] = wrapAction(key, prop)
    }

    //处理state
    if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) { //如果他是ref或者是reactive则说明它是state（注意由于computed也是ref，所以要排除掉计算属性）
      if (!isOption) { //如果是setup语法，把里面的state也存到全局的state里。options结构在
        piniaStore.state.value[id][key] = prop
      }
    }
  }

 // 对actions包一层，做一些处理。store里面存的actions实际都是经过了这个包装的actions。
 // 做了异常处理，如果actions中函数报错，会将错误传递给pinia实例的错误处理函数
 // pinia中删除了mutations，无论是异步
  function wrapAction(name, action) {
    return function () {
      let ret = action.apply(store, arguments) //使this永远指向store

      //action执行后可能是一个promise，todo......

      return ret
    }
  }

  // 把不是用户定义的和是用户定义的都合并到store里，并给外面使用
  Object.assign(store,setupStore)
  piniaStore._stores.set(id, store)//将这个store存到piniaStore中
  return store
}
~~~

**总结：**

创建store的两种方式：传options或者传setup，两者最后都是通过createSetupStore实现。

1. 对于createOptionStore：
   + 提取options对象中的state，getters，actions转化为setupStore函数。
   + 这个setup函数传给上面的createSetupStore来构建store.
   + 再给这个store附上个$reset方法（这个方法只有options定义的store才有，调用该方法可以将当前state重置为初始化的状态）

2. 对于creatSetupStore：
   + 定义一个store存放pinia内置的api和属性
   + 定义一个scope，可以停止内部的响应式
   + 对setupStore中属性遍历，处理state变为响应式，处理getter变为计算属性，wrapAction处理actions，所有函数都改变  this指向当前store。
   + 合并store和setupStore，放到全局pinia的 `_s` 属性中。


