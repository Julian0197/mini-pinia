## 入口函数 index.ts

```ts
export { createPinia } from "./createPinia";
export { defineStore } from "./defineStore";
```

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

```ts
import {piniaSymbol} from './piniaSymbol'
import {getCurrentInstance,inject,reactive,effectScope,isRef,isReactive} from 'vue'
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
    // 针对组件，注入piniaStore
    let piniaStore = instance && inject(piniaSymbol)
    if (piniaStore) {
      setActivePinia(piniaStore)
    }
    // 即使不是组件中，也可以访问piniaStore
    piniaStore = activePinia
    // 第一次使用useStore，根据option创建store
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
