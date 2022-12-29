import { VNode, VNodeChild, isVNode } from './vnode'
import {
  pauseTracking,
  resetTracking,
  shallowReadonly,
  proxyRefs,
  EffectScope,
  markRaw,
  track,
  TrackOpTypes
} from '@vue/reactivity'
import {
  ComponentPublicInstance,
  PublicInstanceProxyHandlers,
  createDevRenderContext,
  exposePropsOnRenderContext,
  exposeSetupStateOnRenderContext,
  ComponentPublicInstanceConstructor,
  publicPropertiesMap,
  RuntimeCompiledPublicInstanceProxyHandlers
} from './componentPublicInstance'
import {
  ComponentPropsOptions,
  NormalizedPropsOptions,
  initProps,
  normalizePropsOptions
} from './componentProps'
import { Slots, initSlots, InternalSlots } from './componentSlots'
import { warn } from './warning'
import { ErrorCodes, callWithErrorHandling, handleError } from './errorHandling'
import { AppContext, createAppContext, AppConfig } from './apiCreateApp'
import { Directive, validateDirectiveName } from './directives'
import {
  applyOptions,
  ComponentOptions,
  ComputedOptions,
  MethodOptions
} from './componentOptions'
import {
  EmitsOptions,
  ObjectEmitsOptions,
  EmitFn,
  emit,
  normalizeEmitsOptions
} from './componentEmits'
import {
  EMPTY_OBJ,
  isFunction,
  NOOP,
  isObject,
  NO,
  makeMap,
  isPromise,
  ShapeFlags,
  extend
} from '@vue/shared'
import { SuspenseBoundary } from './components/Suspense'
import { CompilerOptions } from '@vue/compiler-core'
import { markAttrsAccessed } from './componentRenderUtils'
import { currentRenderingInstance } from './componentRenderContext'
import { startMeasure, endMeasure } from './profiling'
import { convertLegacyRenderFn } from './compat/renderFn'
import { globalCompatConfig, validateCompatConfig } from './compat/compatConfig'
import { SchedulerJob } from './scheduler'


//对象属性类型
export type Data = Record<string, unknown>


//用于在 TSX 组件上扩展允许的未声明props
export interface ComponentCustomProps {}


//TSX 中默认允许组件上未声明的props
export interface AllowedComponentProps {
  class?: unknown
  style?: unknown
}


//不能将整个接口标记为内部接口，因为一些公共接口扩展了它
//组件内置配置
export interface ComponentInternalOptions {
  /**
   * @internal
   */
  //作用域id
  __scopeId?: string
  /**
   * @internal
   */
  //css模块
  __cssModules?: Data
  /**
   * @internal
   */
  //热更新id
  __hmrId?: string


  //是不是内置组件 仅兼容构建，用于摆脱某些兼容性行为
  __isBuiltIn?: boolean


  //文件信息 这个应该公开，以便 devtools 可以使用它
  __file?: string
}


//函数组件继承内部组件配置
export interface FunctionalComponent<P = {}, E extends EmitsOptions = {}>
  extends ComponentInternalOptions {
  //在这里使用 any 是有意的，因此它可以是一个有效的 JSX 元素构造函数
  (props: P, ctx: Omit<SetupContext<E>, 'expose'>): any

  props?: ComponentPropsOptions<P>

  emits?: E | (keyof E)[]

  inheritAttrs?: boolean

  displayName?: string

}

//类组件
export interface ClassComponent {

  new (...args: any[]): ComponentPublicInstance<any, any, any, any, any>

  //组件配置
  __vccOpts: ComponentOptions

}



//具体的组件类型：要么是一个选项对象，要么是一个函数。 
//在代码期望使用实际值的地方使用这个类型，
//例如 检查它是否有功能。 这主要用于内部实现代码
export type ConcreteComponent<
  Props = {}, //props泛型
  RawBindings = any,//绑定属性泛型
  D = any, 
  C extends ComputedOptions = ComputedOptions, //computed泛型
  M extends MethodOptions = MethodOptions //方法配置泛型
> =
  | ComponentOptions<Props, RawBindings, D, C, M> //组件配置
  | FunctionalComponent<Props, any> //一个函数


//在需要组件类型的公共 API 中使用的类型。 一个组件的类型
//构造函数类型是 defineComponent() 返回的人工类型
export type Component<
  Props = any, //泛型1
  RawBindings = any,//泛型2
  D = any,//泛型3
  C extends ComputedOptions = ComputedOptions, //泛型4
  M extends MethodOptions = MethodOptions //泛型5
> =
  | ConcreteComponent<Props, RawBindings, D, C, M> //具体的组件
  | ComponentPublicInstanceConstructor<Props> //组件公开实例构造器


export { ComponentOptions }

//生命周期钩子
type LifecycleHook<TFn = Function> = TFn[] | null

//生命周期钩子
export const enum LifecycleHooks {
  BEFORE_CREATE = 'bc', //beforeCreate
  CREATED = 'c', //created
  BEFORE_MOUNT = 'bm', //beforeMount
  MOUNTED = 'm', //mounted
  BEFORE_UPDATE = 'bu', //beforeUpdate
  UPDATED = 'u', //updated
  BEFORE_UNMOUNT = 'bum', //beforeUnMount
  UNMOUNTED = 'um', //unMounted
  DEACTIVATED = 'da', //deactivated
  ACTIVATED = 'a', //activated
  RENDER_TRIGGERED = 'rtg', //renderTriggered
  RENDER_TRACKED = 'rtc', //renderTracked
  ERROR_CAPTURED = 'ec', //errorCaptured
  SERVER_PREFETCH = 'sp' //serverPrefetch
}

//setup 函数上下文
export interface SetupContext<E = EmitsOptions> {
  attrs: Data //属性
  slots: Slots //插槽
  emit: EmitFn<E> //emit方法
  expose: (exposed?: Record<string, any>) => void //暴露方法
}


//内部的渲染函数
export type InternalRenderFunction = {

  //构造函数
  (
    ctx: ComponentPublicInstance, //组件公共实例 类型
    cache: ComponentInternalInstance['renderCache'], //组件内部实例的渲染缓存 类型

    // for compiler-optimized bindings
    $props: ComponentInternalInstance['props'], //组件内部实例的props 类型
    $setup: ComponentInternalInstance['setupState'], //组件内部实例的 setupState 类型
    $data: ComponentInternalInstance['data'], //组件内部实例的  data类型
    $options: ComponentInternalInstance['ctx'] //组件内部实例的 上下文类型
  ): VNodeChild

  //是不是运行时编译的
  _rc?: boolean 

  //用于兼容v2 所用
  _compatChecked?: boolean // v3 and already checked for v2 compat
  _compatWrapped?: boolean // is wrapped for v2 compat

}




//暴露一些内部实例的属性子集 他们对于高级外部库 和 工具 很有用
//组件内部实例
export interface ComponentInternalInstance {

  uid: number  //实例id
  type: ConcreteComponent //实例对应的组件
  parent: ComponentInternalInstance | null //实例的父组件实例
  root: ComponentInternalInstance //实例的根组件实例
  appContext: AppContext //实例的app上下文


  //组件的虚拟节点
  vnode: VNode


  // 来自父级更新等待的新虚拟节点 The pending new vnode from parent updates
  next: VNode | null


  //该组件的根虚拟节点
  subTree: VNode


  //Bound effect runner to be passed to schedulers
  update: SchedulerJob

 
  //返回虚拟节点的渲染函数
  render: InternalRenderFunction | null


  //服务端渲染返回虚拟节点的渲染函数
  ssrRender?: Function | null


  //当前组件provide的值
  provides: Data


  /**
   * Tracking reactive effects (e.g. watchers) associated with this component
   * so that they can be automatically stopped on component unmount
   * @internal
   */
  //跟踪与此组件关联的反应效果（例如观察者），以便它们可以在组件卸载时自动停止
  scope: EffectScope


  //缓存代理访问类型以避免 hasOwnProperty 调用
  accessCache: Data | null


  /**
   * cache for render function values that rely on _ctx but won't need updates
   * after initialized (e.g. inline handlers)
   * @internal
   */
  //缓存依赖于 _ctx 但在初始化后不需要更新的渲染函数值（例如内联处理程序）
  renderCache: (Function | VNode)[]

 
  //已解析的组件注册表，仅适用于具有 mixins 或 extends 的组件
  components: Record<string, ConcreteComponent> | null


  //已解析的指令注册表，仅适用于具有 mixins 或 extends 的组件
  directives: Record<string, Directive> | null


  //解析的filters 注册表 用于兼容v2
  filters?: Record<string, Function>

  //已解析的props配置
  propsOptions: NormalizedPropsOptions


  //已解析的emits配置
  emitsOptions: ObjectEmitsOptions | null


  //是否继承属性
  inheritAttrs?: boolean

  
  //是不是自定义组件
  isCE?: boolean


  //自定义组件的hmr方法
  ceReload?: (newStyles?: string[]) => void


  
  //剩下的都是用于状态华组件的
 


  //组件实例代理对象
  proxy: ComponentPublicInstance | null


  //通过expose暴露的属性
  exposed: Record<string, any> | null
  exposeProxy: Record<string, any> | null

  /**
   * alternative proxy used only for runtime-compiled render functions using
   * `with` block
   * @internal
   */
  //替代代理仅用于使用“with”块的运行时编译渲染函数
  withProxy: ComponentPublicInstance | null

  /**
   * This is the target for the public instance proxy. It also holds properties
   * injected by user options (computed, methods etc.) and user-attached
   * custom properties (via `this.x = ...`)
   * @internal
   */
  ctx: Data

  // state
  data: Data
  props: Data
  attrs: Data
  slots: InternalSlots
  refs: Data
  emit: EmitFn

  /**
   * used for keeping track of .once event handlers on components
   * @internal
   */
  //用于跟踪组件上的 .once 事件处理程序
  emitted: Record<string, boolean> | null

  /**
   * used for caching the value returned from props default factory functions to
   * avoid unnecessary watcher trigger
   * @internal
   */
  //用于缓存从 props 默认工厂函数返回的值，以避免不必要的 watcher 触发
  propsDefaults: Data


  /**
   * setup related
   * @internal
   */
  //setup 关联的
  setupState: Data


  /**
   * devtools access to additional info
   * @internal
   */
  devtoolsRawSetupState?: any


  /**
   * @internal
   */
  setupContext: SetupContext | null

  /**
   * suspense related
   * @internal
   */
  suspense: SuspenseBoundary | null

  /**
   * suspense pending batch id
   * @internal
   */
  suspenseId: number

  /**
   * @internal
   */
  asyncDep: Promise<any> | null

  /**
   * @internal
   */
  asyncResolved: boolean


  // lifecycle
  isMounted: boolean

  isUnmounted: boolean

  isDeactivated: boolean

  /**
   * @internal
   */
  [LifecycleHooks.BEFORE_CREATE]: LifecycleHook

  /**
   * @internal
   */
  [LifecycleHooks.CREATED]: LifecycleHook
  
  /**
   * @internal
   */
  [LifecycleHooks.BEFORE_MOUNT]: LifecycleHook

  /**
   * @internal
   */
  [LifecycleHooks.MOUNTED]: LifecycleHook

  /**
   * @internal
   */
  [LifecycleHooks.BEFORE_UPDATE]: LifecycleHook

  /**
   * @internal
   */
  [LifecycleHooks.UPDATED]: LifecycleHook

  /**
   * @internal
   */
  [LifecycleHooks.BEFORE_UNMOUNT]: LifecycleHook

  /**
   * @internal
   */
  [LifecycleHooks.UNMOUNTED]: LifecycleHook

  /**
   * @internal
   */
  [LifecycleHooks.RENDER_TRACKED]: LifecycleHook

  /**
   * @internal
   */
  [LifecycleHooks.RENDER_TRIGGERED]: LifecycleHook

  /**
   * @internal
   */
  [LifecycleHooks.ACTIVATED]: LifecycleHook

  /**
   * @internal
   */
  [LifecycleHooks.DEACTIVATED]: LifecycleHook

  /**
   * @internal
   */
  [LifecycleHooks.ERROR_CAPTURED]: LifecycleHook

  /**
   * @internal
   */
  [LifecycleHooks.SERVER_PREFETCH]: LifecycleHook<() => Promise<unknown>>

}

//空的app上下文
const emptyAppContext = createAppContext()

let uid = 0


//创建组件实例
export function createComponentInstance(
  vnode: VNode, //虚拟节点
  parent: ComponentInternalInstance | null, //父组件实例
  suspense: SuspenseBoundary | null //父suspense边界
) {

  //组件对象
  const type = vnode.type as ConcreteComponent

 
  //app上下文
  const appContext =
    (parent ? parent.appContext : vnode.appContext) || emptyAppContext

  
  //组件实例
  const instance: ComponentInternalInstance = {
    uid: uid++, //组件实例id
    vnode, //组件虚拟节点
    type, //组件的描述
    parent, //父组件实例
    appContext, //app上下文
    root: null!, // to be immediately set 根实例
    next: null, 
    subTree: null!, // will be set synchronously right after creation 
    update: null!, // will be set synchronously right after creation
    scope: new EffectScope(true /* detached */), 
    render: null, 
    proxy: null, 
    exposed: null, 
    exposeProxy: null, 
    withProxy: null, 
    provides: parent ? parent.provides : Object.create(appContext.provides), //组件provide值
    accessCache: null!,
    renderCache: [], 

    // local resovled assets
    components: null, //组件注册的组件
    directives: null, //组件注册的指令

    // resolved props and emits options
    propsOptions: normalizePropsOptions(type, appContext), 
    emitsOptions: normalizeEmitsOptions(type, appContext), 

    // emit
    emit: null as any, // to be set immediately 
    emitted: null, 

    // props default value
    propsDefaults: EMPTY_OBJ, 

    // inheritAttrs
    inheritAttrs: type.inheritAttrs, 

    // state
    ctx: EMPTY_OBJ,  
    data: EMPTY_OBJ, 
    props: EMPTY_OBJ,
    attrs: EMPTY_OBJ, 
    slots: EMPTY_OBJ, 
    refs: EMPTY_OBJ, 
    setupState: EMPTY_OBJ, 
    setupContext: null,

    // suspense related
    suspense, 
    suspenseId: suspense ? suspense.pendingId : 0, 
    asyncDep: null, 
    asyncResolved: false,


    //不在这里使用枚举，因为它会导致计算属性
    //生命周期钩子
    isMounted: false, //是不是被挂载了
    isUnmounted: false, //是不是被卸载了
    isDeactivated: false, //是不是失去活性了
    bc: null, //beforeCreate
    c: null, //created
    bm: null, //beforeMount
    m: null, //mounted
    bu: null, //beforeUpdate
    u: null, //updated
    um: null, //unMount
    bum: null,//beforeUnMount
    da: null, 
    a: null,
    rtg: null,
    rtc: null,
    ec: null,
    sp: null
  }

  //设置组件的上下文
  if (__DEV__) {
    instance.ctx = createDevRenderContext(instance)
  } else {
    instance.ctx = { _: instance }
  }

  //设置组件的根实例
  instance.root = parent ? parent.root : instance

  //设置组件实例的emit方法
  instance.emit = emit.bind(null, instance)

  //应用自定义元素的特殊处理
  if (vnode.ce) {
    vnode.ce(instance)
  }

  return instance
}


//当前执行中的组件实例
export let currentInstance: ComponentInternalInstance | null = null

export const getCurrentInstance: () => ComponentInternalInstance | null = () =>
  currentInstance || currentRenderingInstance


//设置当前实例
export const setCurrentInstance = (instance: ComponentInternalInstance) => {
  currentInstance = instance
  instance.scope.on()
}

export const unsetCurrentInstance = () => {
  currentInstance && currentInstance.scope.off()
  currentInstance = null
}

const isBuiltInTag = /*#__PURE__*/ makeMap('slot,component')

export function validateComponentName(name: string, config: AppConfig) {
  const appIsNativeTag = config.isNativeTag || NO
  if (isBuiltInTag(name) || appIsNativeTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component id: ' + name
    )
  }
}


//判断是不是状态化的组件
export function isStatefulComponent(instance: ComponentInternalInstance) {
  return instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
}


//是不是在服务端渲染组件的setup
export let isInSSRComponentSetup = false



//setup 组件
export function setupComponent(
  instance: ComponentInternalInstance, //组件实例
  isSSR = false //是不是服务端渲染
) {


  isInSSRComponentSetup = isSSR

  //获取组件的props children
  const { props, children } = instance.vnode

  //判断是不是状态化的组件
  const isStateful = isStatefulComponent(instance)

  //初始化组件实例的props
  initProps(instance, props, isStateful, isSSR)
 
  //初始化组件实例的插槽
  initSlots(instance, children)


  const setupResult = isStateful
    ? setupStatefulComponent(instance, isSSR)
    : undefined

  isInSSRComponentSetup = false

  return setupResult

}


//setup 状态化组件
function setupStatefulComponent(
  instance: ComponentInternalInstance, //组件实例
  isSSR: boolean //是不是服务端渲染
) {

  //获取组件的描述
  const Component = instance.type as ComponentOptions
  
  //如果是开发模式 验证一些命名规范
  if (__DEV__) {
    if (Component.name) {
      validateComponentName(Component.name, instance.appContext.config)
    }
    if (Component.components) {
      const names = Object.keys(Component.components)
      for (let i = 0; i < names.length; i++) {
        validateComponentName(names[i], instance.appContext.config)
      }
    }
    if (Component.directives) {
      const names = Object.keys(Component.directives)
      for (let i = 0; i < names.length; i++) {
        validateDirectiveName(names[i])
      }
    }
    if (Component.compilerOptions && isRuntimeOnly()) {
      warn(
        `"compilerOptions" is only supported when using a build of Vue that ` +
          `includes the runtime compiler. Since you are using a runtime-only ` +
          `build, the options should be passed via your build tool config instead.`
      )
    }
  }


  //创建渲染代理属性 来 访问 缓存
  instance.accessCache = Object.create(null)

  //创建一个公开实例或者 渲染代理 并进行标记 防止它被observe
  instance.proxy = markRaw(new Proxy(instance.ctx, PublicInstanceProxyHandlers))

  if (__DEV__) {
    //暴露这些props 在渲染上下文
    exposePropsOnRenderContext(instance)
  }

  //调用setup方法
  const { setup } = Component

  if (setup) {
  
    //创建setup 上下文
    const setupContext = (instance.setupContext =
      setup.length > 1 ? createSetupContext(instance) : null)
    
    //设置当前的实例
    setCurrentInstance(instance)
 
    //暂停追踪
    pauseTracking()
    
    //调用setup方法 获取setup的结果
    const setupResult = callWithErrorHandling(
      setup,
      instance,
      ErrorCodes.SETUP_FUNCTION,
      [__DEV__ ? shallowReadonly(instance.props) : instance.props, setupContext]
    )

    //恢复追踪
    resetTracking()
     
    //取消设置当前实例
    unsetCurrentInstance()
    
    //如果返回结果是一个promise
    if (isPromise(setupResult)) {
      setupResult.then(unsetCurrentInstance, unsetCurrentInstance)

      if (isSSR) {
        // return the promise so server-renderer can wait on it
        return setupResult
          .then((resolvedResult: unknown) => {
            handleSetupResult(instance, resolvedResult, isSSR)
          })
          .catch(e => {
            handleError(e, instance, ErrorCodes.SETUP_FUNCTION)
          })
      } else if (__FEATURE_SUSPENSE__) {
        // async setup returned Promise.
        // bail here and wait for re-entry.
        instance.asyncDep = setupResult
      } else if (__DEV__) {
        warn(
          `setup() returned a Promise, but the version of Vue you are using ` +
            `does not support it yet.`
        )
      }
    } else {
      //处理setup的结果
      handleSetupResult(instance, setupResult, isSSR)
    }
  } else {

    //结束组件安装
    finishComponentSetup(instance, isSSR)
  }
}


//处理setup 返回的结果
export function handleSetupResult(
  instance: ComponentInternalInstance, //组件实例
  setupResult: unknown, //setup 返回结果
  isSSR: boolean //是不是服务端渲染
) {

  //如果返回结果是一个函数
  if (isFunction(setupResult)) {
    //setup 返回的是一个内联渲染函数
    if (__NODE_JS__ && (instance.type as ComponentOptions).__ssrInlineRender) {
      // when the function's name is `ssrRender` (compiled by SFC inline mode),
      // set it as ssrRender instead.
      instance.ssrRender = setupResult
    } else {
      //将组件的渲染函数设置为set的返回值
      instance.render = setupResult as InternalRenderFunction
    }

  } 
  //如果返回结果是一个对象
  else if (isObject(setupResult)) {

    //如果返回的是一个虚拟节点
    if (__DEV__ && isVNode(setupResult)) {
      warn(
        `setup() should not return VNodes directly - ` +
          `return a render function instead.`
      )
    }


    //将setup 返回值进行绑定
    //假设存在从模板编译的渲染函数
    if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
      instance.devtoolsRawSetupState = setupResult
    }
    
    //设置组件的setup状态
    instance.setupState = proxyRefs(setupResult)

    if (__DEV__) {
      exposeSetupStateOnRenderContext(instance)
    }

  } 
  //如果返回结果不是函数 又不是对象
  else if (__DEV__ && setupResult !== undefined) {
    warn(
      `setup() should return an object. Received: ${
        setupResult === null ? 'null' : typeof setupResult
      }`
    )
  }

  //结束组件的setup
  finishComponentSetup(instance, isSSR)
}


//编译方法
type CompileFunction = (
  template: string | object, //template
  options?: CompilerOptions //编译配置
) => InternalRenderFunction

let compile: CompileFunction | undefined
let installWithProxy: (i: ComponentInternalInstance) => void

/**
 * For runtime-dom to register the compiler.
 * Note the exported method uses any to avoid d.ts relying on the compiler types.
 */
export function registerRuntimeCompiler(_compile: any) {
  compile = _compile
  installWithProxy = i => {
    if (i.render!._rc) {
      i.withProxy = new Proxy(i.ctx, RuntimeCompiledPublicInstanceProxyHandlers)
    }
  }
}

// dev only
//是不是只有运行时环境
export const isRuntimeOnly = () => !compile


//结束组件的setup过程
export function finishComponentSetup(
  instance: ComponentInternalInstance, //组件实例
  isSSR: boolean, //是不是渲染函数
  skipOptions?: boolean
) {

  //获取组件的描述
  const Component = instance.type as ComponentOptions

  if (__COMPAT__) {
    convertLegacyRenderFn(instance)

    if (__DEV__ && Component.compatConfig) {
      validateCompatConfig(Component.compatConfig)
    }
  }


  //模板或渲染函数进行规范化
  if (__NODE_JS__ && isSSR) {
    // 1. the render function may already exist, returned by `setup`
    // 2. otherwise try to use the `Component.render`
    // 3. if the component doesn't have a render function,
    //    set `instance.render` to NOOP so that it can inherit the render
    //    function from mixins/extend
    instance.render = (instance.render ||
      Component.render ||
      NOOP) as InternalRenderFunction
  } else if (!instance.render) {
    //如果组件不存在渲染函数 渲染函数可以通过setup进行设置
    if (compile && !Component.render) {
      //如果组件没有设置自己定义渲染函数 且存在编译器
      
      //获取组件的template
      const template =
        (__COMPAT__ &&
          instance.vnode.props &&
          instance.vnode.props['inline-template']) ||
        Component.template


      if (template) {
        if (__DEV__) {
          startMeasure(instance, `compile`)
        }

        const { 
          isCustomElement, 
          compilerOptions  //编译配置
        } = instance.appContext.config
          
        //组件编译配置
        const { delimiters, 
          compilerOptions: componentCompilerOptions 
        } = Component
 
        //最终的编译配置
        const finalCompilerOptions: CompilerOptions = extend(
          extend(
            {
              isCustomElement,
              delimiters
            },
            compilerOptions
          ),
          componentCompilerOptions
        )

        if (__COMPAT__) {
          // pass runtime compat config into the compiler
          finalCompilerOptions.compatConfig = Object.create(globalCompatConfig)
          if (Component.compatConfig) {
            extend(finalCompilerOptions.compatConfig, Component.compatConfig)
          }
        }
        
        //生成渲染函数
        Component.render = compile(template, finalCompilerOptions)

        if (__DEV__) {
          endMeasure(instance, `compile`)
        }
      }
    }
    
    //将组件实例的render设置为 用户自己定义的渲染函数
    instance.render = (Component.render || NOOP) as InternalRenderFunction

    // for runtime-compiled render functions using `with` blocks, the render
    // proxy used needs a different `has` handler which is more performant and
    // also only allows a whitelist of globals to fallthrough.
    //对于使用“with”块的运行时编译渲染函数，渲染使用的代理需要一个不同的 `has` 处理程序，
    //它性能更高，并且只允许全局变量的白名单失败
    if (installWithProxy) {
      installWithProxy(instance)
    }
  }

  //支持vue2的options写法
  if (__FEATURE_OPTIONS_API__ && !(__COMPAT__ && skipOptions)) {
    setCurrentInstance(instance)
    pauseTracking()
    applyOptions(instance)
    resetTracking()
    unsetCurrentInstance()
  }

  // warn missing template/render
  // the runtime compilation of template in SSR is done by server-render
  if (__DEV__ && !Component.render && instance.render === NOOP && !isSSR) {
    /* istanbul ignore if */
    if (!compile && Component.template) {
      warn(
        `Component provided template option but ` +
          `runtime compilation is not supported in this build of Vue.` +
          (__ESM_BUNDLER__
            ? ` Configure your bundler to alias "vue" to "vue/dist/vue.esm-bundler.js".`
            : __ESM_BROWSER__
            ? ` Use "vue.esm-browser.js" instead.`
            : __GLOBAL__
            ? ` Use "vue.global.js" instead.`
            : ``) /* should not happen */
      )
    } else {
      warn(`Component is missing template or render function.`)
    }
  }
}

function createAttrsProxy(instance: ComponentInternalInstance): Data {
  return new Proxy(
    instance.attrs,
    __DEV__
      ? {
          get(target, key: string) {
            markAttrsAccessed()
            track(instance, TrackOpTypes.GET, '$attrs')
            return target[key]
          },
          set() {
            warn(`setupContext.attrs is readonly.`)
            return false
          },
          deleteProperty() {
            warn(`setupContext.attrs is readonly.`)
            return false
          }
        }
      : {
          get(target, key: string) {
            track(instance, TrackOpTypes.GET, '$attrs')
            return target[key]
          }
        }
  )
}

export function createSetupContext(
  instance: ComponentInternalInstance
): SetupContext {
  const expose: SetupContext['expose'] = exposed => {
    if (__DEV__ && instance.exposed) {
      warn(`expose() should be called only once per setup().`)
    }
    instance.exposed = exposed || {}
  }

  let attrs: Data
  if (__DEV__) {
    // We use getters in dev in case libs like test-utils overwrite instance
    // properties (overwrites should not be done in prod)
    return Object.freeze({
      get attrs() {
        return attrs || (attrs = createAttrsProxy(instance))
      },
      get slots() {
        return shallowReadonly(instance.slots)
      },
      get emit() {
        return (event: string, ...args: any[]) => instance.emit(event, ...args)
      },
      expose
    })
  } else {
    return {
      get attrs() {
        return attrs || (attrs = createAttrsProxy(instance))
      },
      slots: instance.slots,
      emit: instance.emit,
      expose
    }
  }
}

export function getExposeProxy(instance: ComponentInternalInstance) {
  if (instance.exposed) {
    return (
      instance.exposeProxy ||
      (instance.exposeProxy = new Proxy(proxyRefs(markRaw(instance.exposed)), {
        get(target, key: string) {
          if (key in target) {
            return target[key]
          } else if (key in publicPropertiesMap) {
            return publicPropertiesMap[key](instance)
          }
        }
      }))
    )
  }
}

const classifyRE = /(?:^|[-_])(\w)/g
const classify = (str: string): string =>
  str.replace(classifyRE, c => c.toUpperCase()).replace(/[-_]/g, '')

export function getComponentName(
  Component: ConcreteComponent
): string | undefined {
  return isFunction(Component)
    ? Component.displayName || Component.name
    : Component.name
}

/* istanbul ignore next */
export function formatComponentName(
  instance: ComponentInternalInstance | null,
  Component: ConcreteComponent,
  isRoot = false
): string {
  let name = getComponentName(Component)
  if (!name && Component.__file) {
    const match = Component.__file.match(/([^/\\]+)\.\w+$/)
    if (match) {
      name = match[1]
    }
  }

  if (!name && instance && instance.parent) {
    // try to infer the name based on reverse resolution
    const inferFromRegistry = (registry: Record<string, any> | undefined) => {
      for (const key in registry) {
        if (registry[key] === Component) {
          return key
        }
      }
    }
    name =
      inferFromRegistry(
        instance.components ||
          (instance.parent.type as ComponentOptions).components
      ) || inferFromRegistry(instance.appContext.components)
  }

  return name ? classify(name) : isRoot ? `App` : `Anonymous`
}

//如果是一个类组件
export function isClassComponent(value: unknown): value is ClassComponent {
  return isFunction(value) && '__vccOpts' in value
}
