import {
  ComponentInternalInstance,
  Data,
  getExposeProxy,
  isStatefulComponent
} from './component'
import { nextTick, queueJob } from './scheduler'
import { instanceWatch, WatchOptions, WatchStopHandle } from './apiWatch'
import {
  EMPTY_OBJ,
  hasOwn,
  isGloballyWhitelisted,
  NOOP,
  extend,
  isString,
  isFunction
} from '@vue/shared'
import {
  ReactiveEffect,
  toRaw,
  shallowReadonly,
  track,
  TrackOpTypes,
  ShallowUnwrapRef,
  UnwrapNestedRefs
} from '@vue/reactivity'
import {
  ExtractComputedReturns,
  ComponentOptionsBase,
  ComputedOptions,
  MethodOptions,
  ComponentOptionsMixin,
  OptionTypesType,
  OptionTypesKeys,
  resolveMergedOptions,
  shouldCacheAccess,
  MergedComponentOptionsOverride
} from './componentOptions'
import { EmitsOptions, EmitFn } from './componentEmits'
import { Slots } from './componentSlots'
import { markAttrsAccessed } from './componentRenderUtils'
import { currentRenderingInstance } from './componentRenderContext'
import { warn } from './warning'
import { UnionToIntersection } from './helpers/typeUtils'
import { installCompatInstanceProperties } from './compat/instance'

/**
 * Custom properties added to component instances in any way and can be accessed through `this`
 *
 * @example
 * Here is an example of adding a property `$router` to every component instance:
 * ```ts
 * import { createApp } from 'vue'
 * import { Router, createRouter } from 'vue-router'
 *
 * declare module '@vue/runtime-core' {
 *   interface ComponentCustomProperties {
 *     $router: Router
 *   }
 * }
 *
 * // effectively adding the router to every component instance
 * const app = createApp({})
 * const router = createRouter()
 * app.config.globalProperties.$router = router
 *
 * const vm = app.mount('#app')
 * // we can access the router from the instance
 * vm.$router.push('/')
 * ```
 */
export interface ComponentCustomProperties {}

type IsDefaultMixinComponent<T> = T extends ComponentOptionsMixin
  ? ComponentOptionsMixin extends T
    ? true
    : false
  : false

type MixinToOptionTypes<T> = T extends ComponentOptionsBase<
  infer P,
  infer B,
  infer D,
  infer C,
  infer M,
  infer Mixin,
  infer Extends,
  any,
  any,
  infer Defaults
>
  ? OptionTypesType<P & {}, B & {}, D & {}, C & {}, M & {}, Defaults & {}> &
      IntersectionMixin<Mixin> &
      IntersectionMixin<Extends>
  : never

// ExtractMixin(map type) is used to resolve circularly references
type ExtractMixin<T> = {
  Mixin: MixinToOptionTypes<T>
}[T extends ComponentOptionsMixin ? 'Mixin' : never]

type IntersectionMixin<T> = IsDefaultMixinComponent<T> extends true
  ? OptionTypesType<{}, {}, {}, {}, {}>
  : UnionToIntersection<ExtractMixin<T>>

type UnwrapMixinsType<
  T,
  Type extends OptionTypesKeys
> = T extends OptionTypesType ? T[Type] : never

type EnsureNonVoid<T> = T extends void ? {} : T



//一个公共的组件实例
export type ComponentPublicInstanceConstructor<
  T extends ComponentPublicInstance<
    Props,
    RawBindings,
    D,
    C,
    M
  > = ComponentPublicInstance<any>,
  Props = any,
  RawBindings = any,
  D = any,
  C extends ComputedOptions = ComputedOptions,
  M extends MethodOptions = MethodOptions
> = {
  __isFragment?: never //是不是fragment组件
  __isTeleport?: never //是不是teleport组件
  __isSuspense?: never //是不是suspense组件

  new (...args: any[]): T //构造函数

}

export type CreateComponentPublicInstance<
  P = {},
  B = {},
  D = {},
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
  Extends extends ComponentOptionsMixin = ComponentOptionsMixin,
  E extends EmitsOptions = {},
  PublicProps = P,
  Defaults = {},
  MakeDefaultsOptional extends boolean = false,
  PublicMixin = IntersectionMixin<Mixin> & IntersectionMixin<Extends>,
  PublicP = UnwrapMixinsType<PublicMixin, 'P'> & EnsureNonVoid<P>,
  PublicB = UnwrapMixinsType<PublicMixin, 'B'> & EnsureNonVoid<B>,
  PublicD = UnwrapMixinsType<PublicMixin, 'D'> & EnsureNonVoid<D>,
  PublicC extends ComputedOptions = UnwrapMixinsType<PublicMixin, 'C'> &
    EnsureNonVoid<C>,
  PublicM extends MethodOptions = UnwrapMixinsType<PublicMixin, 'M'> &
    EnsureNonVoid<M>,
  PublicDefaults = UnwrapMixinsType<PublicMixin, 'Defaults'> &
    EnsureNonVoid<Defaults>
> = ComponentPublicInstance<
  PublicP,
  PublicB,
  PublicD,
  PublicC,
  PublicM,
  E,
  PublicProps,
  PublicDefaults,
  MakeDefaultsOptional,
  ComponentOptionsBase<P, B, D, C, M, Mixin, Extends, E, string, Defaults>
>

// public properties exposed on the proxy, which is used as the render context
// in templates (as `this` in the render option)
export type ComponentPublicInstance<
  P = {}, // props type extracted from props option
  B = {}, // raw bindings returned from setup()
  D = {}, // return from data()
  C extends ComputedOptions = {},
  M extends MethodOptions = {},
  E extends EmitsOptions = {},
  PublicProps = P,
  Defaults = {},
  MakeDefaultsOptional extends boolean = false,
  Options = ComponentOptionsBase<any, any, any, any, any, any, any, any, any>
> = {
  $: ComponentInternalInstance
  $data: D
  $props: MakeDefaultsOptional extends true
    ? Partial<Defaults> & Omit<P & PublicProps, keyof Defaults>
    : P & PublicProps
  $attrs: Data
  $refs: Data
  $slots: Slots
  $root: ComponentPublicInstance | null
  $parent: ComponentPublicInstance | null
  $emit: EmitFn<E>
  $el: any
  $options: Options & MergedComponentOptionsOverride
  $forceUpdate: ReactiveEffect
  $nextTick: typeof nextTick
  $watch(
    source: string | Function,
    cb: Function,
    options?: WatchOptions
  ): WatchStopHandle
} & P &
  ShallowUnwrapRef<B> &
  UnwrapNestedRefs<D> &
  ExtractComputedReturns<C> &
  M &
  ComponentCustomProperties

export type PublicPropertiesMap = Record<
  string,
  (i: ComponentInternalInstance) => any
>

/**
 * #2437 In Vue 3, functional components do not have a public instance proxy but
 * they exist in the internal parent chain. For code that relies on traversing
 * public $parent chains, skip functional ones and go to the parent instead.
 */
const getPublicInstance = (
  i: ComponentInternalInstance | null
): ComponentPublicInstance | ComponentInternalInstance['exposed'] | null => {
  if (!i) return null
  if (isStatefulComponent(i)) return getExposeProxy(i) || i.proxy
  return getPublicInstance(i.parent)
}


//公开属性map
export const publicPropertiesMap: PublicPropertiesMap = /*#__PURE__*/ extend(
  Object.create(null),
  {
    $: i => i,  //组件实例自身
    $el: i => i.vnode.el, //组件的真实dom
    $data: i => i.data, //组件的data
    $props: i => (__DEV__ ? shallowReadonly(i.props) : i.props), //组件的props
    $attrs: i => (__DEV__ ? shallowReadonly(i.attrs) : i.attrs), //组件的attrs
    $slots: i => (__DEV__ ? shallowReadonly(i.slots) : i.slots), //组件的slots
    $refs: i => (__DEV__ ? shallowReadonly(i.refs) : i.refs), //组件的refs
    $parent: i => getPublicInstance(i.parent), //组件的父实例
    $root: i => getPublicInstance(i.root), //组件的根实例
    $emit: i => i.emit, //组件的emit
    $options: i => (__FEATURE_OPTIONS_API__ ? resolveMergedOptions(i) : i.type), //组件的options
    $forceUpdate: i => () => queueJob(i.update), //组件强制更新方法
    $nextTick: i => nextTick.bind(i.proxy!), //组件的nextTick方法
    $watch: i => (__FEATURE_OPTIONS_API__ ? instanceWatch.bind(i) : NOOP) //组件的watch方法
  } as PublicPropertiesMap
)

if (__COMPAT__) {
  installCompatInstanceProperties(publicPropertiesMap)
}

const enum AccessTypes {
  SETUP,
  DATA,
  PROPS,
  CONTEXT,
  OTHER
}

export interface ComponentRenderContext {
  [key: string]: any
  _: ComponentInternalInstance
}


//公开实例代理的处理
export const PublicInstanceProxyHandlers: ProxyHandler<any> = {

  get({ _: instance }: ComponentRenderContext, key: string) {

    const { 
      ctx, 
      setupState, 
      data, 
      props, 
      accessCache, 
      type, 
      appContext 
    } = instance

    //让内部格式化程序知道这是一个 Vue 实例
    if (__DEV__ && key === '__isVue') {
      return true
    }


    //在开发期间优先考虑 <script setup> 绑定。 
    //这甚至允许使用以 _ 或 $ 开头的属性 这样以便它与渲染函数 内联的生产行为保持一致，
    //并且确实可以访问所有声明的变量
    if (
      __DEV__ &&
      setupState !== EMPTY_OBJ &&
      setupState.__isScriptSetup &&
      hasOwn(setupState, key)
    ) {
      return setupState[key]
    }

    //渲染上下文中的每个属性访问都会调用此 getter，在渲染期间是一个主要的热点，
    //这里最大的开销是多次 hasOwn() 调用，做简单的属性访问要快多了，
    //所以我们可以使用一个访问缓存对象来记住一个键对应的访问类型
    let normalizedProps

    //如果访问的不是以$开头的属性
    if (key[0] !== '$') {
      
      //获取缓存内信息
      const n = accessCache![key]
     
      //如果存在缓存信息
      if (n !== undefined) {
        switch (n) {
           //如果是setup的属性
          case AccessTypes.SETUP:
            return setupState[key]
          //如果是data属性
          case AccessTypes.DATA:
            return data[key]
          //如果是上下文属性
          case AccessTypes.CONTEXT:
            return ctx[key]
          //如果是props属性
          case AccessTypes.PROPS:
            return props![key]
        }
      } 
      //不存在缓存结果 且 setupState存在这个属性
      else if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
        //缓存结果
        accessCache![key] = AccessTypes.SETUP
        return setupState[key]
      } 
       //不存在缓存结果 且 data存在这个属性
      else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
        //缓存结果
        accessCache![key] = AccessTypes.DATA
        return data[key]
      } else if (
        // only cache other properties when instance has declared (thus stable)
        // props
        (normalizedProps = instance.propsOptions[0]) &&
        hasOwn(normalizedProps, key)
      ) {
        accessCache![key] = AccessTypes.PROPS
        return props![key]
      } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
        accessCache![key] = AccessTypes.CONTEXT
        return ctx[key]
      } else if (!__FEATURE_OPTIONS_API__ || shouldCacheAccess) {
        accessCache![key] = AccessTypes.OTHER
      }
    }

    //公开的get
    const publicGetter = publicPropertiesMap[key]


    let cssModule, globalProperties
    // public $xxx properties
    if (publicGetter) {
      if (key === '$attrs') {
        track(instance, TrackOpTypes.GET, key)
        __DEV__ && markAttrsAccessed()
      }
      return publicGetter(instance)
    } else if (
      // css module (injected by vue-loader)
      (cssModule = type.__cssModules) &&
      (cssModule = cssModule[key])
    ) {
      return cssModule
    } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
      // user may set custom properties to `this` that start with `$`
      accessCache![key] = AccessTypes.CONTEXT
      return ctx[key]
    } else if (
      // global properties
      ((globalProperties = appContext.config.globalProperties),
      hasOwn(globalProperties, key))
    ) {
      if (__COMPAT__) {
        const desc = Object.getOwnPropertyDescriptor(globalProperties, key)!
        if (desc.get) {
          return desc.get.call(instance.proxy)
        } else {
          const val = globalProperties[key]
          return isFunction(val) ? val.bind(instance.proxy) : val
        }
      } else {
        return globalProperties[key]
      }
    } else if (
      __DEV__ &&
      currentRenderingInstance &&
      (!isString(key) ||
        // #1091 avoid internal isRef/isVNode checks on component instance leading
        // to infinite warning loop
        key.indexOf('__v') !== 0)
    ) {
      if (
        data !== EMPTY_OBJ &&
        (key[0] === '$' || key[0] === '_') &&
        hasOwn(data, key)
      ) {
        warn(
          `Property ${JSON.stringify(
            key
          )} must be accessed via $data because it starts with a reserved ` +
            `character ("$" or "_") and is not proxied on the render context.`
        )
      } else if (instance === currentRenderingInstance) {
        warn(
          `Property ${JSON.stringify(key)} was accessed during render ` +
            `but is not defined on instance.`
        )
      }
    }
  },

  set(
    { _: instance }: ComponentRenderContext,
    key: string,
    value: any
  ): boolean {
    const { data, setupState, ctx } = instance
    if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
      setupState[key] = value
    } else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
      data[key] = value
    } else if (hasOwn(instance.props, key)) {
      __DEV__ &&
        warn(
          `Attempting to mutate prop "${key}". Props are readonly.`,
          instance
        )
      return false
    }
    if (key[0] === '$' && key.slice(1) in instance) {
      __DEV__ &&
        warn(
          `Attempting to mutate public property "${key}". ` +
            `Properties starting with $ are reserved and readonly.`,
          instance
        )
      return false
    } else {
      if (__DEV__ && key in instance.appContext.config.globalProperties) {
        Object.defineProperty(ctx, key, {
          enumerable: true,
          configurable: true,
          value
        })
      } else {
        ctx[key] = value
      }
    }
    return true
  },

  has(
    {
      _: { data, setupState, accessCache, ctx, appContext, propsOptions }
    }: ComponentRenderContext,
    key: string
  ) {
    let normalizedProps
    return (
      accessCache![key] !== undefined ||
      (data !== EMPTY_OBJ && hasOwn(data, key)) ||
      (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) ||
      ((normalizedProps = propsOptions[0]) && hasOwn(normalizedProps, key)) ||
      hasOwn(ctx, key) ||
      hasOwn(publicPropertiesMap, key) ||
      hasOwn(appContext.config.globalProperties, key)
    )
  }
}

if (__DEV__ && !__TEST__) {
  PublicInstanceProxyHandlers.ownKeys = (target: ComponentRenderContext) => {
    warn(
      `Avoid app logic that relies on enumerating keys on a component instance. ` +
        `The keys will be empty in production mode to avoid performance overhead.`
    )
    return Reflect.ownKeys(target)
  }
}

export const RuntimeCompiledPublicInstanceProxyHandlers = /*#__PURE__*/ extend(
  {},
  PublicInstanceProxyHandlers,
  {
    get(target: ComponentRenderContext, key: string) {
      // fast path for unscopables when using `with` block
      if ((key as any) === Symbol.unscopables) {
        return
      }
      return PublicInstanceProxyHandlers.get!(target, key, target)
    },
    has(_: ComponentRenderContext, key: string) {
      const has = key[0] !== '_' && !isGloballyWhitelisted(key)
      if (__DEV__ && !has && PublicInstanceProxyHandlers.has!(_, key)) {
        warn(
          `Property ${JSON.stringify(
            key
          )} should not start with _ which is a reserved prefix for Vue internals.`
        )
      }
      return has
    }
  }
)


//开发环境使用
//在开发环境中，代理对象暴露相同的属性在this上，这样能更方便的打印检查
//在生成环境这将会是一个空对象所以这些的定义都会被跳过
//创建dev环境下的组件上下文
export function createDevRenderContext(instance: ComponentInternalInstance) {

  const target: Record<string, any> = {}

  // expose internal instance for proxy handlers
  Object.defineProperty(target, `_`, {
    configurable: true,
    enumerable: false,
    get: () => instance
  })

  //暴露一些公开的属性
  Object.keys(publicPropertiesMap).forEach(key => {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: false,
      get: () => publicPropertiesMap[key](instance),
      //被代理拦截所以不需要实现，但要防止设置错误
      set: NOOP
    })
  })

  return target as ComponentRenderContext
}


//仅开发模式
//暴露props在渲染上下文
export function exposePropsOnRenderContext(
  instance: ComponentInternalInstance //组件实例
) {

  //获取组件实例上下文 和 props设置
  const {
    ctx,
    propsOptions: [propsOptions]
  } = instance

  //如果存在props设置
  if (propsOptions) {
    Object.keys(propsOptions).forEach(key => {
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => instance.props[key],
        set: NOOP
      })
    })
  }
}

// dev only
export function exposeSetupStateOnRenderContext(
  instance: ComponentInternalInstance
) {
  const { ctx, setupState } = instance
  Object.keys(toRaw(setupState)).forEach(key => {
    if (!setupState.__isScriptSetup && (key[0] === '$' || key[0] === '_')) {
      warn(
        `setup() return property ${JSON.stringify(
          key
        )} should not start with "$" or "_" ` +
          `which are reserved prefixes for Vue internals.`
      )
      return
    }
    Object.defineProperty(ctx, key, {
      enumerable: true,
      configurable: true,
      get: () => setupState[key],
      set: NOOP
    })
  })
}
