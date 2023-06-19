# Pinia基本使用 => Pinia源码分析

## 优势

全新的vue状态管理库

+ 支持vue2和vue3
+ 抛弃传统的 `Mutation` ，只有 `state, getter` 和 `action` ，简化状态管理库
+ 没有模块的嵌套结构：每个store都是互相独立的，更好的代码分割且没有命名空间
+ ts支持

## 基本使用

**初始化项目：** `npm init vite@latest`

**安装Pinia:** `npm i pinia`

##### **挂载Pinia**

~~~js
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.mount('#app')
~~~

##### **创建store**

~~~js
// src/store/index.js
import { defineStore } form 'pinia'

export const mainStore = defineStore('main', {
    state: () => {
        return {
            msg: 'hello, pinia'
        }
    },
    getters: {},
    actions: {}
})
~~~

##### **使用store**

~~~html
// src/components/HelloWorld.vue
<script setup lang="ts">
    import { mainStore } from../store/indexconst
    store = mainStore()
</script>
<template>
	<h2>{{ store.msg }}</h2>
</template>
~~~

##### **解构store**

当store中的多个参数需要被使用到的时候，为了更简洁的使用这些变量，我们通常采用解构的方式一次性获取所有的变量名

`const { count } = store`  ES6传统方法解构，解构得到的数据不再具备响应式。

pinia采用  `storeToRefs`，`const { count } = storeToRefs(store)`

##### **修改数据状态**

简单数据，直接操作`store.属性名`

多条数据修改：`$patch`

~~~js
// $patch + 对象
const onObjClick = () => {
    store.$patch({
        count: store.count + 2,
        msg: store.msg === 'hello, pinia' ? 'aa' : 'bb'
    })
}
~~~

通过actions修改：

~~~js
// store/index.js 传入
actions: {
    changeState() {
        this.count++
    }
}

// 实际使用
const actionClick = () => {
    store.changeState()
}
~~~

##### **getters**

和计算属性一样

##### **store之间的互相调用**

在 Pinia 中，可以在一个 `store` 中 `import` 另外一个 `store` ，然后通过调用引入 store 方法的形式，获取引入 `store` 的状态

+ 新建store

+ 在原store中导入新建的Store，并获取数据

