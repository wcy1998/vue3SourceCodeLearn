
//patch标志 是一种编译器生成的优化提示
//在 diff 期间遇到带有 dynamicChildren 的块时,diff算法会进入优化模式，
//在这种模式下，我们知道 vdom 是由编译器生成的渲染函数产生的，所以算法只需要
// 处理由这些补丁标志明确标记的更新。
/**
//Patch flags can be combined using the | bitwise operator and can be checked
// using the & operator 
 * ```js
 * const flag = TEXT | CLASS
 * if (flag & TEXT) { ... }
 * ```
 * Check the `patchElement` function in '../../runtime-core/src/renderer.ts' to see how the
 * flags are handled during diff.
 */

export const enum PatchFlags {

  //指示具有动态 textContent 的元素
  TEXT = 1,

  //指示具有动态绑定class的元素
  CLASS = 1 << 1,

  //指示具有动态style的元素
  //编译器将静态字符串样式预编译成静态对象检测并提升内联静态对象 
  /* e.g. style="color: red" and :style="{ color: 'red' }" both get hoisted as
   *   const style = { color: 'red' }
   *   render() { return e('div', { style }) }
   */
  STYLE = 1 << 2,


  /**
   * Indicates an element that has non-class/style dynamic props.
   * Can also be on a component that has any dynamic props (includes
   * class/style). when this flag is present, the vnode also has a dynamicProps
   * array that contains the keys of the props that may change so the runtime
   * can diff them faster (without having to worry about removed props)
   */
  //指示具有非style class的动态props的元素，也可以是任何具有动态props的组件包括style class属性
  //当这个标志存在时，vnode 会有一个 dynamicProps 包含可能更改的props键值的数组，以便运行时可以更快地diff它们
  //无需担心移除的props
  PROPS = 1 << 3,


  //指示具有动态keys 和 props的元素
  //当keys发生改变，一个全diff一直需要去移除旧的key值
  //这个标志 和 PROPS  CLASS  STYLE 是互斥的
  FULL_PROPS = 1 << 4,


  //指示具有事件侦听器的元素（需要在服务端渲染时进行绑定）
  HYDRATE_EVENTS = 1 << 5,


  //指示一个fragment元素它的子节点的顺序不会改变
  STABLE_FRAGMENT = 1 << 6,


  //指示一个fragment元素被设置了key  或者 部分的子节点被设置了key
  KEYED_FRAGMENT = 1 << 7,

  //指示一个fragment且子节点没有被设置key
  UNKEYED_FRAGMENT = 1 << 8,


  //指示一个元素只需要不是props的patch,像是ref，directives，
  //由于每个修补的 vnode 都会检查 refs 和 onVnodeXXX 钩子，
  //它只是简单地标记 vnode，以便父块将跟踪它
  NEED_PATCH = 1 << 9,

  //指示一个组件 具有动态的slots（引用 v-for 迭代值或动态插槽名称的插槽），具有这个标志的组件会一直强制更新
  DYNAMIC_SLOTS = 1 << 10,


  //指示仅因为用户在模板的根级别放置注释而创建的fragment。 
  //这是一个仅限开发环境的标志，因为注释在生产中被删除
  DEV_ROOT_FRAGMENT = 1 << 11,



  //下面都是特殊标志
  //特殊标志是负整数,他们永远不会与使用相匹配按位运算符按位匹配只应发生在分支中补丁标志 > 0
  //而且都是互斥的


 
  //指示提升的静态 vnode 这是活水过程中跳过整个子树的提示，因为静态内容永远不需要更新
  HOISTED = -1,

  /**
   * A special flag that indicates that the diffing algorithm should bail out
   * of optimized mode. For example, on block fragments created by renderSlot()
   * when encountering non-compiler generated slots (i.e. manually written
   * render functions, which should always be fully diffed)
   * OR manually cloneVNodes
   */
  //一个特殊标志 指示 diff算法应该退出优化模式
  BAIL = -2
}

/**
 * dev only flag -> name mapping
 */
export const PatchFlagNames = {
  [PatchFlags.TEXT]: `TEXT`,
  [PatchFlags.CLASS]: `CLASS`,
  [PatchFlags.STYLE]: `STYLE`,
  [PatchFlags.PROPS]: `PROPS`,
  [PatchFlags.FULL_PROPS]: `FULL_PROPS`,
  [PatchFlags.HYDRATE_EVENTS]: `HYDRATE_EVENTS`,
  [PatchFlags.STABLE_FRAGMENT]: `STABLE_FRAGMENT`,
  [PatchFlags.KEYED_FRAGMENT]: `KEYED_FRAGMENT`,
  [PatchFlags.UNKEYED_FRAGMENT]: `UNKEYED_FRAGMENT`,
  [PatchFlags.NEED_PATCH]: `NEED_PATCH`,
  [PatchFlags.DYNAMIC_SLOTS]: `DYNAMIC_SLOTS`,
  [PatchFlags.DEV_ROOT_FRAGMENT]: `DEV_ROOT_FRAGMENT`,
  [PatchFlags.HOISTED]: `HOISTED`,
  [PatchFlags.BAIL]: `BAIL`
}
