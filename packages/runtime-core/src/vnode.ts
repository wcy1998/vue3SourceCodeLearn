import {
  isArray,
  isFunction,
  isString,
  isObject,
  EMPTY_ARR,
  extend,
  normalizeClass,
  normalizeStyle,
  PatchFlags,
  ShapeFlags,
  SlotFlags,
  isOn
} from '@vue/shared'
import {
  ComponentInternalInstance,
  Data,
  ConcreteComponent,
  ClassComponent,
  Component,
  isClassComponent
} from './component'
import { RawSlots } from './componentSlots'
import { isProxy, Ref, toRaw, ReactiveFlags, isRef } from '@vue/reactivity'
import { AppContext } from './apiCreateApp'
import {
  SuspenseImpl,
  isSuspense,
  SuspenseBoundary
} from './components/Suspense'
import { DirectiveBinding } from './directives'
import { TransitionHooks } from './components/BaseTransition'
import { warn } from './warning'
import { TeleportImpl, isTeleport } from './components/Teleport'
import {
  currentRenderingInstance,
  currentScopeId
} from './componentRenderContext'
import { RendererNode, RendererElement } from './renderer'
import { NULL_DYNAMIC_COMPONENT } from './helpers/resolveAssets'
import { hmrDirtyComponents } from './hmr'
import { convertLegacyComponent } from './compat/component'
import { convertLegacyVModelProps } from './compat/componentVModel'
import { defineLegacyVNodeProperties } from './compat/renderFn'
import { convertLegacyRefInFor } from './compat/ref'

export const Fragment = Symbol(__DEV__ ? 'Fragment' : undefined) as any as {
  __isFragment: true
  new (): {
    $props: VNodeProps
  }
}
export const Text = Symbol(__DEV__ ? 'Text' : undefined)
export const Comment = Symbol(__DEV__ ? 'Comment' : undefined)
export const Static = Symbol(__DEV__ ? 'Static' : undefined)

//虚拟节点的各种类型
export type VNodeTypes =
  | string  
  | VNode
  | Component
  | typeof Text
  | typeof Static
  | typeof Comment
  | typeof Fragment
  | typeof TeleportImpl
  | typeof SuspenseImpl

export type VNodeRef =
  | string
  | Ref
  | ((ref: object | null, refs: Record<string, any>) => void)

export type VNodeNormalizedRefAtom = {
  i: ComponentInternalInstance
  r: VNodeRef
  f?: boolean // v2 compat only, refInFor marker
}

export type VNodeNormalizedRef =
  | VNodeNormalizedRefAtom
  | VNodeNormalizedRefAtom[]

type VNodeMountHook = (vnode: VNode) => void
type VNodeUpdateHook = (vnode: VNode, oldVNode: VNode) => void
export type VNodeHook =
  | VNodeMountHook
  | VNodeUpdateHook
  | VNodeMountHook[]
  | VNodeUpdateHook[]


// https://github.com/microsoft/TypeScript/issues/33099
//虚拟节点props
export type VNodeProps = {
  key?: string | number | symbol
  ref?: VNodeRef

  // vnode hooks
  onVnodeBeforeMount?: VNodeMountHook | VNodeMountHook[]
  onVnodeMounted?: VNodeMountHook | VNodeMountHook[]
  onVnodeBeforeUpdate?: VNodeUpdateHook | VNodeUpdateHook[]
  onVnodeUpdated?: VNodeUpdateHook | VNodeUpdateHook[]
  onVnodeBeforeUnmount?: VNodeMountHook | VNodeMountHook[]
  onVnodeUnmounted?: VNodeMountHook | VNodeMountHook[]

}

type VNodeChildAtom =
  | VNode
  | string
  | number
  | boolean
  | null
  | undefined
  | void

export type VNodeArrayChildren = Array<VNodeArrayChildren | VNodeChildAtom>

export type VNodeChild = VNodeChildAtom | VNodeArrayChildren


export type VNodeNormalizedChildren =
  | string
  | VNodeArrayChildren
  | RawSlots
  | null



//虚拟节点
export interface VNode<
  HostNode = RendererNode,
  HostElement = RendererElement,
  ExtraProps = { [key: string]: any }
> {



  /**
   * @internal
   */
  //是不是一个虚拟节点
  __v_isVNode: true

  /**
   * @internal
   */
  //是否调过响应式
  [ReactiveFlags.SKIP]: true
  
  //虚拟节点对应的类型 可能是一个组件
  type: VNodeTypes
  
  //虚拟节点的props
  props: (VNodeProps & ExtraProps) | null

  //虚拟节点的key值
  key: string | number | symbol | null

  //虚拟节点的ref
  ref: VNodeNormalizedRef | null

  /**
   * SFC only. This is assigned on vnode creation using currentScopeId
   * which is set alongside currentRenderingInstance.
   */
  //仅用于单文件组件，在虚拟节点创建时使用当前的scopeId(和当前渲染中的实例一起设置)
  scopeId: string | null

  /**
   * SFC only. This is assigned to:
   * - Slot fragment vnodes with :slotted SFC styles.
   * - Component vnodes (during patch/hydration) so that its root node can
   *   inherit the component's slotScopeIds
   * @internal
   */
  //仅用于单文件组件
  slotScopeIds: string[] | null

  //子虚拟节点 可能是文本 可能是虚拟节点列表
  children: VNodeNormalizedChildren
  
  //虚拟节点对应的组件实例
  component: ComponentInternalInstance | null
  
  //当前虚拟节点绑定的指令
  dirs: DirectiveBinding[] | null

  transition: TransitionHooks<HostElement> | null

  // DOM
  el: HostNode | null  //当前虚拟节点对应的真实dom
  anchor: HostNode | null // fragment anchor   fragment 锚点
  target: HostElement | null // teleport target  teleport 目标
  targetAnchor: HostNode | null // teleport target anchor  teleport目标锚点

  /**
   * number of elements contained in a static vnode
   * @internal
   */
  //静态 vnode 中包含的元素数
  staticCount: number

  // suspense
  //suspense的边界
  suspense: SuspenseBoundary | null


  /**
   * @internal
   */
  ssContent: VNode | null

  /**
   * @internal
   */
  ssFallback: VNode | null

  //用于优化使用

  //虚拟节点的类型标志
  shapeFlag: number

  //虚拟节点的patch标志
  patchFlag: number


  /**
   * @internal
   */
  //动态props
  dynamicProps: string[] | null

  /**
   * @internal
   */
  //动态子节点
  dynamicChildren: VNode[] | null

  // application root node only
  //app上下文
  appContext: AppContext | null


  /**
   * @internal attached by v-memo
   */
  //v-memo
  memo?: any[]

  /**
   * @internal __COMPAT__ only
   */
  isCompatRoot?: true


  /**
   * @internal custom element interception hook
   */
  //自定义元素拦截钩子
  ce?: (instance: ComponentInternalInstance) => void

}


//因为 v-if  和 v-for是动态会改变节点结构的两种方式，
//一旦我们把 v-if 分支和每个 v-for fragment当做一个块，
//我们就可以将模板分成一个个的嵌套块，并在每个块内节点 结构会很稳定。
//这允许我们跳过大多数孩子节点的diff，只去担心动态节点(动态节点会被patch标志)
export const blockStack: (VNode[] | null)[] = []
export let currentBlock: VNode[] | null = null


//打开一个块，这个必须在createBlock之前调用，它不能是createBlock的一部分
//因为这个块的子节点是在createBlock调用之前被评估的
//The generated code typically looks like this:
// ```js
// function render() {
//   return (openBlock(),createBlock('div', null, [...]))
// }
//创建 v-for fragment块时 disableTracking 为真，因为 v-for fragment块，总是会diff它的子节点
export function openBlock(disableTracking = false) {
  blockStack.push((currentBlock = disableTracking ? null : []))
}


export function closeBlock() {
  blockStack.pop()
  currentBlock = blockStack[blockStack.length - 1] || null
}


//我们是否应该追踪块内的动态子节点
//只有当isBlockTreeEnabled的值大于0时 我们才会追踪
//我们没有使用简单的布尔值，因为该值可能需要通过 v-once 的嵌套使用来递增/递减
export let isBlockTreeEnabled = 1

/**
 * 有时需要禁用块跟踪，例如在创建需要由 v-once 缓存的树期间
   The compiler generates
 * code like this:
 *
 * ``` js
 * _cache[1] || (
 *   setBlockTracking(-1),
 *   _cache[1] = createVNode(...),
 *   setBlockTracking(1),
 *   _cache[1]
 * )
 * ```
 *
 * @private
 */
export function setBlockTracking(value: number) {
  isBlockTreeEnabled += value
}

function setupBlock(vnode: VNode) {
  // save current block children on the block vnode
  vnode.dynamicChildren =
    isBlockTreeEnabled > 0 ? currentBlock || (EMPTY_ARR as any) : null
  // close block
  closeBlock()
  // a block is always going to be patched, so track it as a child of its
  // parent block
  if (isBlockTreeEnabled > 0 && currentBlock) {
    currentBlock.push(vnode)
  }
  return vnode
}

/**
 * @private
 */
export function createElementBlock(
  type: string,
  props?: Record<string, any> | null,
  children?: any,
  patchFlag?: number,
  dynamicProps?: string[],
  shapeFlag?: number
) {
  return setupBlock(
    createBaseVNode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      shapeFlag,
      true /* isBlock */
    )
  )
}

/**
 * Create a block root vnode. Takes the same exact arguments as `createVNode`.
 * A block root keeps track of dynamic nodes within the block in the
 * `dynamicChildren` array.
 *
 * @private
 */
export function createBlock(
  type: VNodeTypes | ClassComponent,
  props?: Record<string, any> | null,
  children?: any,
  patchFlag?: number,
  dynamicProps?: string[]
): VNode {
  return setupBlock(
    createVNode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      true /* isBlock: prevent a block from tracking itself */
    )
  )
}

//如果是一个虚拟节点
export function isVNode(value: any): value is VNode {
  return value ? value.__v_isVNode === true : false
}

//是不是相同类型的虚拟节点
export function isSameVNodeType(
  n1: VNode,  //旧节点
  n2: VNode   //新节点
  ): boolean {

  if (
    __DEV__ &&
    n2.shapeFlag & ShapeFlags.COMPONENT &&
    hmrDirtyComponents.has(n2.type as ConcreteComponent)
  ) {
    // HMR only: if the component has been hot-updated, force a reload.
    return false
  }

  //查看两者的key 和 组件类型是否一致
  return n1.type === n2.type && n1.key === n2.key

}

let vnodeArgsTransformer:
  | ((
      args: Parameters<typeof _createVNode>,
      instance: ComponentInternalInstance | null
    ) => Parameters<typeof _createVNode>)
  | undefined

/**
 * Internal API for registering an arguments transform for createVNode
 * used for creating stubs in the test-utils
 * It is *internal* but needs to be exposed for test-utils to pick up proper
 * typings
 */
export function transformVNodeArgs(transformer?: typeof vnodeArgsTransformer) {
  vnodeArgsTransformer = transformer
}

const createVNodeWithArgsTransform = (
  ...args: Parameters<typeof _createVNode>
): VNode => {
  return _createVNode(
    ...(vnodeArgsTransformer
      ? vnodeArgsTransformer(args, currentRenderingInstance)
      : args)
  )
}


//内部对象的唯一key
export const InternalObjectKey = `__vInternal`

const normalizeKey = ({ key }: VNodeProps): VNode['key'] =>
  key != null ? key : null

const normalizeRef = ({ ref }: VNodeProps): VNodeNormalizedRefAtom | null => {
  return (
    ref != null
      ? isString(ref) || isRef(ref) || isFunction(ref)
        ? { i: currentRenderingInstance, r: ref }
        : ref
      : null
  ) as any
}


//创建虚拟节点
function createBaseVNode(
  //组件的描述
  type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT, 
  //组件的props
  props: (Data & VNodeProps) | null = null,
  //子节点
  children: unknown = null, 
  //patch标志
  patchFlag = 0, 
  //动态props
  dynamicProps: string[] | null = null,
  //组件类型
  shapeFlag = type === Fragment ? 0 : ShapeFlags.ELEMENT,
  //是不是块节点
  isBlockNode = false,
  //是不是需要规范化所有的子节点
  needFullChildrenNormalization = false 
) {

  //创建一个虚拟节点
  const vnode = {
    //标记是一个虚拟节点
    __v_isVNode: true, 
    //标记跳过
    __v_skip: true,
    //虚拟节点的组件描述
    type, 
    //虚拟节点的props
    props,
    //虚拟节点的key 
    key: props && normalizeKey(props), 
    //虚拟节点的ref
    ref: props && normalizeRef(props),
    //节点的scopeId
    scopeId: currentScopeId,
    //节点的插槽scopeId
    slotScopeIds: null, 
    //节点的子虚拟节点
    children,
    //虚拟节点的组件实例
    component: null, 
    suspense: null, 
    ssContent: null, 
    ssFallback: null,
    dirs: null,
    transition: null,
    el: null, 
    anchor: null,
    target: null,
    targetAnchor: null,
    staticCount: 0,
    //虚拟节点的类型
    shapeFlag,
    //虚拟节点的patch标志
    patchFlag, 
    //虚拟节点的动态props
    dynamicProps, 
    //虚拟节点的动态子节点
    dynamicChildren: null,
    //虚拟节点的app上下文
    appContext: null
  } as VNode

  //如果需要规范化所有的子节点
  if (needFullChildrenNormalization) {

    //规范化子节点
    normalizeChildren(vnode, children)

    // normalize suspense children
    //在对suspense子节点进行规范化
    if (__FEATURE_SUSPENSE__ && shapeFlag & ShapeFlags.SUSPENSE) {
      ;(type as typeof SuspenseImpl).normalize(vnode)
    }

  } else if (children) {
    // compiled element vnode - if children is passed, only possible types are
    // string or Array.
    vnode.shapeFlag |= isString(children)
      ? ShapeFlags.TEXT_CHILDREN
      : ShapeFlags.ARRAY_CHILDREN
  }

  //验证key值
  if (__DEV__ && vnode.key !== vnode.key) {
    warn(`VNode created with invalid key (NaN). VNode type:`, vnode.type)
  }


  //追踪  块级树的 虚拟节点
  if (
    //如果允许追踪虚拟节点
    isBlockTreeEnabled > 0 &&
    // 避免块节点跟踪自身
    !isBlockNode &&
    // 存在当前父块
    currentBlock &&
    //patch标志的存在表示该节点需要在更新时需要进行patch
    //组件节点也应该始终被patch，因为即使组件不需要更新，
    //它也需要将实例持久化到下一个 vnode，以便稍后可以正确卸载它
    (vnode.patchFlag > 0 || shapeFlag & ShapeFlags.COMPONENT) &&
    //EVENTS 标志仅用于活水阶段，而且如果它是唯一的标志，
    // 则由于处理程序缓存，vnode 不应被视为动态
    vnode.patchFlag !== PatchFlags.HYDRATE_EVENTS

  ) {
    currentBlock.push(vnode)
  }


  if (__COMPAT__) {
    convertLegacyVModelProps(vnode)
    convertLegacyRefInFor(vnode)
    defineLegacyVNodeProperties(vnode)
  }

  return vnode
}

export { createBaseVNode as createElementVNode }


//创建虚拟节点
export const createVNode = (
  __DEV__ ? createVNodeWithArgsTransform : _createVNode
) as typeof _createVNode



//创建虚拟节点
function _createVNode(
  type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT, //组件
  props: (Data & VNodeProps) | null = null, //组件props
  children: unknown = null, //子节点
  patchFlag: number = 0, //对比标志
  dynamicProps: string[] | null = null, //动态props
  isBlockNode = false //是不是块节点
): VNode {

  //没有组件就创建一个注释
  if (!type || type === NULL_DYNAMIC_COMPONENT) {
    if (__DEV__ && !type) {
      warn(`Invalid vnode type when creating vnode: ${type}.`)
    }
    type = Comment
  }

  //如果是一个虚拟节点 这个发生在动态组件的情形下 确保在克隆节点期间进行refs的合并 而不是 覆盖
  if (isVNode(type)) {
    // createVNode receiving an existing vnode. This happens in cases like
    // <component :is="vnode"/>
    // #2078 make sure to merge refs during the clone instead of overwriting it
    const cloned = cloneVNode(type, props, true /* mergeRef: true */)
    //规范化子节点
    if (children) {
      normalizeChildren(cloned, children)
    }
    //返回克隆后的节点
    return cloned
  }

  // class component normalization.
  //如果是一个类组件
  if (isClassComponent(type)) {
    type = type.__vccOpts
  }

  // 2.x async/functional component compat
  //兼容 vue2的异步 和 函数式组件
  if (__COMPAT__) {
    type = convertLegacyComponent(type, currentRenderingInstance)
  }

  // class & style normalization.
  //如果传递了props

  //规范化props中的css 和 style相关属性
  if (props) {
    // for reactive or proxy objects, we need to clone it to enable mutation.
    props = guardReactiveProps(props)!
    let { class: klass, style } = props
    if (klass && !isString(klass)) {
      props.class = normalizeClass(klass)
    }
    if (isObject(style)) {
      // reactive state objects need to be cloned since they are likely to be
      // mutated
      if (isProxy(style) && !isArray(style)) {
        style = extend({}, style)
      }
      props.style = normalizeStyle(style)
    }
  }

  // encode the vnode type information into a bitmap

  //判断当前组件的类型

  //如果组件是一个方法 说明是一个函数式组件
  //如果组件是一个对象 说明是一个有状态的组件
  //如果组件是一个teleport 说明是一个teleport组件
  //如果组件是一个suspense 说明是一个suspense组件
  //如果组件是一个string类型 说明是一个元素 
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : __FEATURE_SUSPENSE__ && isSuspense(type)
    ? ShapeFlags.SUSPENSE
    : isTeleport(type)
    ? ShapeFlags.TELEPORT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : isFunction(type)
    ? ShapeFlags.FUNCTIONAL_COMPONENT
    : 0

  //提示接受到的组件是一个响应式对象 将其转换为普通对象
  if (__DEV__ && shapeFlag & ShapeFlags.STATEFUL_COMPONENT && isProxy(type)) {
    type = toRaw(type)
    warn(
      `Vue received a Component which was made a reactive object. This can ` +
        `lead to unnecessary performance overhead, and should be avoided by ` +
        `marking the component with \`markRaw\` or using \`shallowRef\` ` +
        `instead of \`ref\`.`,
      `\nComponent that was made reactive: `,
      type
    )
  }
  
  //创建虚拟节点
  return createBaseVNode(
    type,
    props,
    children,
    patchFlag,
    dynamicProps, //动态props
    shapeFlag, //组件类型
    isBlockNode, //是不是块节点
    true 
  )
}

export function guardReactiveProps(props: (Data & VNodeProps) | null) {
  if (!props) return null
  return isProxy(props) || InternalObjectKey in props
    ? extend({}, props)
    : props
}

export function cloneVNode<T, U>(
  vnode: VNode<T, U>,
  extraProps?: (Data & VNodeProps) | null,
  mergeRef = false
): VNode<T, U> {
  // This is intentionally NOT using spread or extend to avoid the runtime
  // key enumeration cost.
  const { props, ref, patchFlag, children } = vnode
  const mergedProps = extraProps ? mergeProps(props || {}, extraProps) : props
  const cloned: VNode = {
    __v_isVNode: true,
    __v_skip: true,
    type: vnode.type,
    props: mergedProps,
    key: mergedProps && normalizeKey(mergedProps),
    ref:
      extraProps && extraProps.ref
        ? // #2078 in the case of <component :is="vnode" ref="extra"/>
          // if the vnode itself already has a ref, cloneVNode will need to merge
          // the refs so the single vnode can be set on multiple refs
          mergeRef && ref
          ? isArray(ref)
            ? ref.concat(normalizeRef(extraProps)!)
            : [ref, normalizeRef(extraProps)!]
          : normalizeRef(extraProps)
        : ref,
    scopeId: vnode.scopeId,
    slotScopeIds: vnode.slotScopeIds,
    children:
      __DEV__ && patchFlag === PatchFlags.HOISTED && isArray(children)
        ? (children as VNode[]).map(deepCloneVNode)
        : children,
    target: vnode.target,
    targetAnchor: vnode.targetAnchor,
    staticCount: vnode.staticCount,
    shapeFlag: vnode.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: perserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag:
      extraProps && vnode.type !== Fragment
        ? patchFlag === -1 // hoisted node
          ? PatchFlags.FULL_PROPS
          : patchFlag | PatchFlags.FULL_PROPS
        : patchFlag,
    dynamicProps: vnode.dynamicProps,
    dynamicChildren: vnode.dynamicChildren,
    appContext: vnode.appContext,
    dirs: vnode.dirs,
    transition: vnode.transition,

    // These should technically only be non-null on mounted VNodes. However,
    // they *should* be copied for kept-alive vnodes. So we just always copy
    // them since them being non-null during a mount doesn't affect the logic as
    // they will simply be overwritten.
    component: vnode.component,
    suspense: vnode.suspense,
    ssContent: vnode.ssContent && cloneVNode(vnode.ssContent),
    ssFallback: vnode.ssFallback && cloneVNode(vnode.ssFallback),
    el: vnode.el,
    anchor: vnode.anchor
  }
  if (__COMPAT__) {
    defineLegacyVNodeProperties(cloned)
  }
  return cloned as any
}

/**
 * Dev only, for HMR of hoisted vnodes reused in v-for
 * https://github.com/vitejs/vite/issues/2022
 */
function deepCloneVNode(vnode: VNode): VNode {
  const cloned = cloneVNode(vnode)
  if (isArray(vnode.children)) {
    cloned.children = (vnode.children as VNode[]).map(deepCloneVNode)
  }
  return cloned
}

/**
 * @private
 */
export function createTextVNode(text: string = ' ', flag: number = 0): VNode {
  return createVNode(Text, null, text, flag)
}

/**
 * @private
 */
export function createStaticVNode(
  content: string,
  numberOfNodes: number
): VNode {
  // A static vnode can contain multiple stringified elements, and the number
  // of elements is necessary for hydration.
  const vnode = createVNode(Static, null, content)
  vnode.staticCount = numberOfNodes
  return vnode
}

/**
 * @private
 */
export function createCommentVNode(
  text: string = '',
  // when used as the v-else branch, the comment node must be created as a
  // block to ensure correct updates.
  asBlock: boolean = false
): VNode {
  return asBlock
    ? (openBlock(), createBlock(Comment, null, text))
    : createVNode(Comment, null, text)
}

export function normalizeVNode(child: VNodeChild): VNode {
  if (child == null || typeof child === 'boolean') {
    // empty placeholder
    return createVNode(Comment)
  } else if (isArray(child)) {
    // fragment
    return createVNode(
      Fragment,
      null,
      // #3666, avoid reference pollution when reusing vnode
      child.slice()
    )
  } else if (typeof child === 'object') {
    // already vnode, this should be the most common since compiled templates
    // always produce all-vnode children arrays
    return cloneIfMounted(child)
  } else {
    // strings and numbers
    return createVNode(Text, null, String(child))
  }
}

// optimized normalization for template-compiled render fns
export function cloneIfMounted(child: VNode): VNode {
  return child.el === null || child.memo ? child : cloneVNode(child)
}


//规范化子节点
export function normalizeChildren(
  vnode: VNode,  //虚拟节点
  children: unknown //子节点
  ) {

  let type = 0
  
  //当前节点的类型
  const { shapeFlag } = vnode

  if (children == null) {
    children = null
  } else if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === 'object') {
    if (shapeFlag & ShapeFlags.ELEMENT || shapeFlag & ShapeFlags.TELEPORT) {
      // Normalize slot to plain children for plain element and Teleport
      const slot = (children as any).default
      if (slot) {
        // _c marker is added by withCtx() indicating this is a compiled slot
        slot._c && (slot._d = false)
        normalizeChildren(vnode, slot())
        slot._c && (slot._d = true)
      }
      return
    } else {
      type = ShapeFlags.SLOTS_CHILDREN
      const slotFlag = (children as RawSlots)._
      if (!slotFlag && !(InternalObjectKey in children!)) {
        // if slots are not normalized, attach context instance
        // (compiled / normalized slots already have context)
        ;(children as RawSlots)._ctx = currentRenderingInstance
      } else if (slotFlag === SlotFlags.FORWARDED && currentRenderingInstance) {
        // a child component receives forwarded slots from the parent.
        // its slot type is determined by its parent's slot type.
        if (
          (currentRenderingInstance.slots as RawSlots)._ === SlotFlags.STABLE
        ) {
          ;(children as RawSlots)._ = SlotFlags.STABLE
        } else {
          ;(children as RawSlots)._ = SlotFlags.DYNAMIC
          vnode.patchFlag |= PatchFlags.DYNAMIC_SLOTS
        }
      }
    }
  } else if (isFunction(children)) {
    children = { default: children, _ctx: currentRenderingInstance }
    type = ShapeFlags.SLOTS_CHILDREN
  } else {
    children = String(children)
    // force teleport children to array so it can be moved around
    if (shapeFlag & ShapeFlags.TELEPORT) {
      type = ShapeFlags.ARRAY_CHILDREN
      children = [createTextVNode(children as string)]
    } else {
      type = ShapeFlags.TEXT_CHILDREN
    }
  }
  vnode.children = children as VNodeNormalizedChildren
  vnode.shapeFlag |= type
}

export function mergeProps(...args: (Data & VNodeProps)[]) {
  const ret: Data = {}
  for (let i = 0; i < args.length; i++) {
    const toMerge = args[i]
    for (const key in toMerge) {
      if (key === 'class') {
        if (ret.class !== toMerge.class) {
          ret.class = normalizeClass([ret.class, toMerge.class])
        }
      } else if (key === 'style') {
        ret.style = normalizeStyle([ret.style, toMerge.style])
      } else if (isOn(key)) {
        const existing = ret[key]
        const incoming = toMerge[key]
        if (existing !== incoming) {
          ret[key] = existing
            ? [].concat(existing as any, incoming as any)
            : incoming
        }
      } else if (key !== '') {
        ret[key] = toMerge[key]
      }
    }
  }
  return ret
}
