// 保存一个全局的Vue
let _Vue = null

// Store类
class Store {
  constructor(options) {
    // 初始化
    const state = options.state || {}
    const mutations = options.mutations || {}
    const actions = options.actions || {}
    const getters = options.getters || {}
    // 实现state
    // state中数据转化为响应式
    this.state = _Vue.observable(state)

    // 实现getters（计算属性）
    // Object.create(null)而不是{}避免属性和对象原型链上的属性重名
    this.getters = Object.create(null)
    // 添加get方法
    Object.keys(getters).forEach((key) => {
      Object.defineProperties(this.getters, key, {
        get: () => {
          // 改变this指向为当前store实例，传入state
          return getters[key].call(this, this.state)
        }
      })
    })

    // 实现mutations，只有通过mutations改变state中数据
    // 拿到options中的mutations传递给store实例对象
    this.mutations = Object.create(null)
    Object.keys(mutations).forEach((key) => {
      this.mutations[key] = (params) => {
        mutations[key].call(this, this.state, params)
      }
    })

    // 实现actions，异步任务的处理，也要触发mutations
    this.actions = Object.create(null)
    Object.keys(actions).forEach((key) => {
      this.actions[key] = (params) => {
        actions[key].call(this, this.state, params)
      }
    })

    // 实现commit和dispatch方法
    commit = (eventName, params) => {
      this.mutations[eventName](params)
    }
    dispatch = (eventName, params) => {
      this.actions[eventName](params)
    }
  }
}

// Vuex需要使用Vue.use安装插件，vue会调用插件的install方法
// 在install方法中可以添加一些全局功能
function install(Vue) {
  // 保存到全局 _Vue
  _Vue = Vue
  // 全局注册混入beforeCreate选项，每一个vue实例都能调用store对象
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
}

const mapState = (params) => {
  // mini-vuex只针对数组，不支持对象
  if (!Array.isArray(params)) {
    throw new Error('目前只支持数组')
  }
  let obj = {}
  params.forEach((item) => {
    obj[item] = function() {
      return this.$store.state[item]
    }
  })
  return obj
}

const mapMutations = (params) => {
  if (!Array.isArray(params)) {
    throw new Error('目前只支持数组')
  }
  let obj = {}
  params.forEach((item) => {
    obj[item] = function(params) {
      return this.$store.commit(item, params)
    }
  })
  return obj
}

const mapActions = (params) => {
  if (!Array.isArray(params)) {
    throw new Error('目前只支持数组')
  }
  let obj = {}
  params.forEach((item) => {
    obj[item] = function(params) {
      return this.$store.dispatch(item, params)
    }
  })
  return obj
}

const mapGetters = (params) => {
  if (!Array.isArray(params)) {
    throw new Error('目前只支持数组')
  }
  let obj = {}
  params.forEach((item) => {
    obj[item] = function(params) {
      return this.$store.getters[item]
    }
  })
  return obj
}

export { mapState, mapMutations, mapActions, mapGetters }

export default {
  install,
  Store,
}