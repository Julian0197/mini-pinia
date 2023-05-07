# VUEX基本使用 => 手写MINI-VUEX

## 简介

Vuex——状态管理工具

解决问题：

+ 多个视图依赖同一个状态（data，methods）
+ 来自不同视图的行为需要变更同一个状态

Vuex优势：

+ vuex集中管理功能共享数据，易于开发和维护
+ 高效地实现组件间的数据共享
+ vuex中的数据都是响应式的

## 基本使用

~~~js
/* src/store/index.js */

// 导入 Vue
import Vue from 'vue'
// 导入 Vuex 插件
import Vuex from 'vuex'

// 把 Vuex 注册到Vue 上
Vue.use(Vuex)

export default new Vuex.Store({
  // 在开发环境开启严格模式 这样修改数据 就必须通过 mutation 来处理
  strict:products.env.NODE_ENV !== 'production',
  // 状态
  state: {
  },
  // 用来处理状态
  mutations: {
  },
  // 用于异步处理
  actions: {
  },
  // 用来挂载模块
  modules: {
  }
})
~~~

将store挂载到vue后，所有的组件就可以直接从store中获取全局数据了

~~~js
import Vue from 'vue'
import App from './App.vue'
import store from './store'

Vue.config.productionTip = false

new Vue({
  // 挂载到vue 中
  store,
  render: (h) => h(App),
}).$mount('#app')
~~~

### state

组件获取state数据：

+ `this.$store.state.xxx`

+ `mapState`把store映射到组件的计算属性

  ~~~vue
  <template>
    <div id="app">
      {{ name }}
      {{ age }}
    </div>
  </template>
  
  <script>
  // 从 Vuex 中导入 mapState
  import { mapState } from 'vuex'
  export default {
    name: 'App',
    computed: {
      // 将 store 映射到当前组件的计算属性
      ...mapState(['name', 'age'])
    }
  }
  // 如果store中的值和当前组件有相同的状态，可以在mapState中传入一个对象，给状态起别名
  // computed: {
  //    ...mapState({name2: 'name', age2: 'age'})
  //  }
  </script>
  ~~~


### Mutations

必须使用Mutations对Store中状态进行修改，方便集中监控数据变化。

~~~js
/* src/store/index.js */

// 导入 Vue
import Vue from 'vue'
// 导入 Vuex 插件
import Vuex from 'vuex'

// 把 Vuex 注册到Vue 上
Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    name: 'Macro',
    age: 31
  },
  mutations: {
    // 在这里定义 方法
    /**
     *
     * @param {*} state 第一个参数是 Store 中的状态(必须传递)
     * @param {*} newName 传入的参数 后面是多个
     */
    changeName(state, newName) {
      // 这里简单举个例子 修改个名字
      state.name = newName
    },
  },
  actions: {},
  modules: {},
})

~~~

在组件中触发mutations的方法：

+ 在methods中定义一个方法，里面调用mutations的changeName。`this.$store.commit('changeName', 'Reus')`
+ 在methods中使用mapMutations，将mutations中的方法映射到methods中，就能直接使用。`...mapMutations(['changeName'])`

### Action

处理异步任务，通过Action触发Mutation间接改变状态。

~~~js
 actions: {
    /**
     *
     * @param {*} context 上下文默认传递的参数
     * @param {*} newName 自己传递的参数
     */
    // 定义一个异步的方法 context是 store
    changeNameAsync(context, newName) {
      // 这里用 setTimeout 模拟异步
      setTimeout(() => {
        // 在这里调用 mutations 中的处理方法
        context.commit('changeName', newName)
      }, 2000)
    },
  },
~~~

在组件中触发Actions的异步方法：

+ `this.$store.dispatch()`
+ `...mapActions(['changeNameAsync'])`

### Getter

计算属性，需要对state中的数据做一些简单封装

~~~js
getters: {
    // 在这里对 状态 进行包装
    /**
     *
     * @param {*} state 状态 如果要使用 state 里面的数据，第一个参数默认就是 state ，名字随便取
     * @returns
     */
    decorationName(state) {
      return `${state.name}今年${state.age}岁`
    },
~~~

两种方式导入：

+ `this.$store.getters.decorationName`
+ `...mapGetters(['decorationName'])`

### Module

vuex将store分成不同模块，每个模块都有属于自己的state、getter、action、mutation。

比如，有一个animal.js

~~~js
/* animal.js */

const state = {
  animalName: '狮子',
}
const mutations = {
  setName(state, newName) {
    state.animalName = newName
  },
}

//导出
export default {
  state,
  mutations,
}
~~~

在 `store/index.js`中的 `modules` 进行挂载这个模块

~~~js
export default new Vuex.Store({
  modules: {
    animal,
  },
})
~~~

然后就可以直接在组件中使用了

~~~vue
<template>
  <div id="app">
    {{ this.$store.state.animal.animalName }}
    <button @click="$store.commit('setName', '老虎')">改名</button>
  </div>
</template>
~~~

上述方法比较繁琐，可以开启命名空间再进行映射。`namespaced: true`

~~~vue
<template>
  <div id="app">
    {{ animalName }}
    <button @click="setName('老鹰')">改名</button>
  </div>
</template>

<script>

// 从 Vuex 中导入 mapState mapMutations
import { mapState, mapMutations } from 'vuex'
export default {
  name: 'App',
  computed: {
    // mapState 使用方式和之前有些许不同，第一个是module挂载的模块名
    // 第二个参数是 animal 模块中的 state 属性
    ...mapState('animal', ['animalName'])
  },
  methods: {
    // mapMutations 使用方式也和之前有些许不同，第一个是module挂载的模块名
    // 第二个参数是 animal 模块中的 mutation 方法
    ...mapMutations('animal', ['setName'])
  },
}
</script>
~~~

## MINI-VUEX实现
详细见代码注释