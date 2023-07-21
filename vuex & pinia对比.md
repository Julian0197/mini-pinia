### vuex

#### 为什么vuex要通过 `store.commit('add')`才能触发事件执行，不可以直接调用`mutation`函数操作么？

1. 直接调用mutation函数会绕过Vuex的状态管理机制，这样做可能会导致状态的变化无法被追踪，也无法进行状态的调试和记录。而通过store.commit方法，可以确保所有的状态变化都经过Vuex的mutation函数，从而实现了状态的追踪和维护。
2. 我们处理异步任务，也是通过Action触发Mutation间接改变状态。

#### 为什么存在异步调用的函数需要 `store.dispatch('asyncAdd')`，不能直接通过 `store.commit('asyncAdd')`?

`dispatch`和`commit`方法比较复杂，但是注意到源码中：dispatch返回的是一个`Promise`对象，而commit方法没有返回值，完全是同步代码的操作。

Promise对象可以对返回值链式调用，确保状态可追踪。

#### `createStore`和`useStore`发生了什么？

`createStore`:
+ 接受一个包含`state`,`mutations`,`actions`和`getters`的对象
+ 将对象转化为响应式
+ 处理getters，封装为响应式属性
+ 通过`createStore`创建了一个vuex的实例对象
  
`useStore`：
+ 在main.js中调用`app.use(vuex)`，会自动执行vuex的`useStore`
+ + 全局注册混入`beforeCreate`选项，在vue实例创建之初，把$store挂载到vue的原型对象上，这样每一个vue实例都能调用store对象

### pinia

#### 官方文档上pinia和vuex的不同

+ 重构`store`模块（扁平化结构），采用map对象，每个store对应一个id，类似于vuex的命名空间
+ 废除`mutations` 。mutations被认为是非常冗长的。最初带来了`devtools`集成，但这不再是问题。
+ 更好的ts支持，所有的内容都是类型化的，无需创建自定义的复杂类型包装器
+ 支持热更新，编辑store不需要重新加载页面
+ 支持服务端渲染

#### 注册插件（vuex/pinia）时候有什么不同？

vuex将store放到vue的原型对象上，组件可以通过原型链获取。

~~~js
_Vue.mixin({
    // 在vue实例创建之初，把$store挂载到vue上
    beforeCreate() {
      // this.$options  是new Vue() 传递的对象
      if (this.$options.store) {
        // 将store挂载在到vue原型上
        _Vue.prototype.$store = this.$options.store
      }
    }
  })
~~~

pinia采用:
~~~js
app.provide(piniaSymbol, pinia); // 通过 provide 来注入 pinia 实例
app.config.globalProperties.$pinia = pinia; // 在 vue 项目当中设置全局属性 $pinia
~~~

其中provide/inject将数据放到组件实例上在created生命周期前就可以通过inject访问:

~~~js
export function provide(key, value) {
  // 父组件存储数据
  const currentInstance: any = getCurrentInstance(); // 只有在setup内部使用

  if (currentInstance) {
    // ES6对象结构，创建一个新变量provides，浅拷贝对象的属性
    let { provides } = currentInstance;
    // 拿到父亲的provides
    const parentProvides = currentInstance.parent.provides;
    // 初始化状态：说明当前provides还没有赋值
    if (provides === parentProvides) {
      // 当前组件provides变成了一个空对象，且原型指向parentProvides
      provides = currentInstance.provides = Object.create(parentProvides);
    }
    provides[key] = value;
  }
}
~~~

#### 响应式方面有什么不同？

pinia采用了`effectScope`，可以随时通过`.stop`终止响应式。

#### pinia的扁平化管理是什么

单例模式，只会创建一个pinia实例对象，store是一个map对象，通过id管理不同的子store。