import { App, effectScope, markRaw, ref, Ref } from "vue";
import { piniaSymbol } from "./helper";

// 定义activePinia全局变量，存放piniaStore。
// 相比vuex的store在beforeCreate时被挂载到vue的原型对象上，不在vue组件也能访问到piniaStore（router）
export let activePinia;
export const setActivePinia = (piniaStore) => (activePinia = piniaStore);

/**
 * 创建pinia实例对象
 */
export function createPinia() {
  // 创建响应式空间,
  // 传入的函数会在effectScope的作用域内执行,方便后续通过stop方法停止响应式。
  const scope = effectScope(true);
  // 声明一个ref并赋值给state
  const state = scope.run(() => ref({}));
  // markRaw使其不具备响应式
  const pinia = markRaw({
    install(app: App) {
      // 将piniaStore暴露到全局
      setActivePinia(pinia); 
      // 通过provide注入pinia
      app.provide(piniaSymbol, pinia);
    },
    // 提供给外界用于注册插件
    use(plugin) {},
    _s: new Map(), // 存放所有store
    state,
    _e: scope,
  });
  return pinia;
}
