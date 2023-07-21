import {
  computed,
  ComputedRef,
  effectScope,
  EffectScope,
  inject,
  markRaw,
  reactive,
  toRaw,
  toRefs,
} from "vue";
import { getCurrentInstance } from "vue";
import { piniaSymbol } from "./helper";
import { activePinia, setActivePinia } from "./createPinia";

/**
 * 创建store
 * @param options
 * @returns
 */
export function defineStore(options: {
  id: string;
  state: any;
  getters: any;
  actions: any;
}) {
  let { id } = options;
  function useStore() {
    const instance = getCurrentInstance(); // 获取实例
    // 通过inject获取pinia实例
    let pinia = instance && inject(piniaSymbol);
    if (pinia) {
      setActivePinia(pinia);
    }
    // 即使不是组件中，也可以访问pinia，并断言pinia一定存在（前面找不到pinia会报错的逻辑省略了）
    pinia = activePinia!;
    // 单例模式，始终只有一个store
    if (!pinia._s.has(id)) {
      // 第一次不存在
      createOptionsStore(id, options, pinia);
    }
    const store = pinia._s.get(id); // 获取当前store的全部数据
    return store;
  }
  useStore.$id = id;
  return useStore;
}

/**
 * 处理state getters
 * 将setup函数作为参数传值到createSetupStore。
 * @param id
 * @param options
 * @param pinia
 */
function createOptionsStore(id: string, options: any, pinia: any) {
  const { state, actions, getters } = options;
  function setup() {
    // state是Ref
    pinia.state.value[id] = state ? state() : {};
    // 将options中的state转化为响应式对象
    const localState = toRefs(pinia.state.value[id]);
    return Object.assign(
      localState, // ref后的state
      actions,
      // getters处理成computed
      Object.keys(getters || {}).reduce((computedGetters, name) => {
        computedGetters[name] = markRaw(
          computed(() => {
            const store = pinia._s.get(id);
            return getters![name].call(store, store);
          })
        );
        return computedGetters;
      }, {})
    );
  }
  let store = createSetupStore(id, setup, pinia);
  return store;
}

/**
 * 处理action以及配套API将其加入store
 * @param $id
 * @param setup
 * @param pinia
 */
function createSetupStore($id: string, setup: any, pinia: any) {
  let scope!: EffectScope;
  // 这样包一层就可以到时候通过pinia.store.stop()来停止全部store的响应式
  const setupStore = pinia._e.run(() => {
    scope = effectScope();
    return scope.run(() => setup());
  });

  // 将状态补丁应用于当前状态
  function $patch(partialStateOrMutator) {
    // mini版实现仅支持传入function
    if (typeof partialStateOrMutator === "function") {
      partialStateOrMutator(pinia.state.value[$id]);
    }
  }

  // 注销当前store
  function $dispose() {
    scope.stop();
    pinia._s.delete($id); // 删除effectMap结构
  }

  // 所有pinia的methods
  let partialStore = {
    _p: pinia,
    $id,
    $reset: () => console.log("reset"), // 该版本不实现
    $patch,
    $onAction: () => console.log("onAction"), // 该版本不实现
    $subscribe: () => console.log("subscribe"), // 该版本不实现
    $dispose,
  };
  // 合并methods和store
  const store: any = reactive(
    Object.assign(toRaw({}), partialStore, setupStore)
  )
  pinia._s.set($id, store)
  return store
}
