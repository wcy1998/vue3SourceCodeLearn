
//createApp Api
import {
  ConcreteComponent,
  Data,
  validateComponentName,
  Component,
  ComponentInternalInstance
} from './component'
import {
  ComponentOptions,
  MergedComponentOptions,
  RuntimeCompilerOptions
} from './componentOptions'
import { ComponentPublicInstance } from './componentPublicInstance'
import { Directive, validateDirectiveName } from './directives'
import { RootRenderFunction } from './renderer'
import { InjectionKey } from './apiInject'
import { warn } from './warning'
import { createVNode, cloneVNode, VNode } from './vnode'
import { RootHydrateFunction } from './hydration'
import { devtoolsInitApp, devtoolsUnmountApp } from './devtools'
import { isFunction, NO, isObject } from '@vue/shared'
import { version } from '.'
import { installAppCompatProperties } from './compat/global'
import { NormalizedPropsOptions } from './componentProps'
import { ObjectEmitsOptions } from './componentEmits'


//app实例类型
export interface App<HostElement = any> {
  version: string  //版本
  config: AppConfig //app配置
  use(plugin: Plugin, ...options: any[]): this //使用插件方法
  mixin(mixin: ComponentOptions): this //使用mixin方法
  component(name: string): Component | undefined //注册组件方法
  component(name: string, component: Component): this // 注册组件方法
  directive(name: string): Directive | undefined //注册指令方法
  directive(name: string, directive: Directive): this //注册指令方法
  mount(     //挂载组件方法
    rootContainer: HostElement | string,
    isHydrate?: boolean,
    isSVG?: boolean
  ): ComponentPublicInstance
  unmount(): void //卸载组件方法
  provide<T>(key: InjectionKey<T> | string, value: T): this //provide值方法

  // internal, but we need to expose these for the server-renderer and devtools
  _uid: number   //app实例id
  _component: ConcreteComponent  //app对应的组件实例
  _props: Data | null //app的props
  _container: HostElement | null //app的容器
  _context: AppContext //app的上下文
  _instance: ComponentInternalInstance | null //app组件实例

  /**
   * v2 compat only
   */
  filter?(name: string): Function | undefined  //兼容vue2的注册filter
  filter?(name: string, filter: Function): this

  /**
   * @internal v3 compat only
   */                                        
  _createRoot?(options: ComponentOptions): ComponentPublicInstance
}

export type OptionMergeFunction = (to: unknown, from: unknown) => any

export interface AppConfig {
  // @private
  readonly isNativeTag?: (tag: string) => boolean

  performance: boolean
  optionMergeStrategies: Record<string, OptionMergeFunction>
  globalProperties: Record<string, any>
  errorHandler?: (
    err: unknown,
    instance: ComponentPublicInstance | null,
    info: string
  ) => void
  warnHandler?: (
    msg: string,
    instance: ComponentPublicInstance | null,
    trace: string
  ) => void

  /**
   * Options to pass to @vue/compiler-dom.
   * Only supported in runtime compiler build.
   */
  compilerOptions: RuntimeCompilerOptions

  /**
   * @deprecated use config.compilerOptions.isCustomElement
   */
  isCustomElement?: (tag: string) => boolean

  /**
   * Temporary config for opt-in to unwrap injected refs.
   * TODO deprecate in 3.3
   */
  unwrapInjectedRef?: boolean
}

export interface AppContext {
  app: App // for devtools
  config: AppConfig
  mixins: ComponentOptions[]
  components: Record<string, Component>
  directives: Record<string, Directive>
  provides: Record<string | symbol, any>

  /**
   * Cache for merged/normalized component options
   * Each app instance has its own cache because app-level global mixins and
   * optionMergeStrategies can affect merge behavior.
   * @internal
   */
  optionsCache: WeakMap<ComponentOptions, MergedComponentOptions>
  /**
   * Cache for normalized props options
   * @internal
   */
  propsCache: WeakMap<ConcreteComponent, NormalizedPropsOptions>
  /**
   * Cache for normalized emits options
   * @internal
   */
  emitsCache: WeakMap<ConcreteComponent, ObjectEmitsOptions | null>
  /**
   * HMR only
   * @internal
   */
  reload?: () => void
  /**
   * v2 compat only
   * @internal
   */
  filters?: Record<string, Function>
}

type PluginInstallFunction = (app: App, ...options: any[]) => any

export type Plugin =
  | (PluginInstallFunction & { install?: PluginInstallFunction })
  | {
      install: PluginInstallFunction
    }


//创建app上下文
export function createAppContext(): AppContext {
  return {
    app: null as any,  //app实例
    config: {  //app的配置
      isNativeTag: NO, //判断是不是原生tag
      performance: false, //是不是开启性能检测
      globalProperties: {}, //全局的一些属性
      optionMergeStrategies: {}, //合并策略
      errorHandler: undefined, //错误处理器
      warnHandler: undefined, //告警处理器
      compilerOptions: {} //编译配置
    },
    mixins: [], //app的mixin
    components: {}, //app的组件
    directives: {}, //app的指令
    provides: Object.create(null), //app的 provide
    optionsCache: new WeakMap(), //配置缓存
    propsCache: new WeakMap(), //props缓存
    emitsCache: new WeakMap() //emits的缓存
  }
}

//创建app方法的类型 
export type CreateAppFunction<HostElement> = (
  rootComponent: Component, //组件
  rootProps?: Data | null //一个配置项
) => App<HostElement>

let uid = 0


//返回一个创建app实例的方法
export function createAppAPI<HostElement>(
  render: RootRenderFunction, //渲染方法
  hydrate?: RootHydrateFunction //服务端渲染方法
): CreateAppFunction<HostElement> {

  return function createApp(
    rootComponent,  //根组件
    rootProps = null //根组件的props
    ) {
    
    //如果传递的根节点props不是object就失效
    if (rootProps != null && !isObject(rootProps)) {
      __DEV__ && warn(`root props passed to app.mount() must be an object.`)
      rootProps = null
    }
    
    //创建一个app上下文
    const context = createAppContext()
    
    //已经安装了的插件
    const installedPlugins = new Set()

    //是不是已经挂载了
    let isMounted = false


    //app实例
    const app: App = (context.app = 
      {
      _uid: uid++, //app实例的唯一标识
      _component: rootComponent as ConcreteComponent, //app实例的组件
      _props: rootProps, //app实例的根props
      _container: null, //app实例的容器
      _context: context, //app实例的上下文
      _instance: null, //app实例
 
      version, //app实例的版本

      get config() { //获取app实例的配置
        return context.config
      },

      set config(v) { //不能直接更改app实例
        if (__DEV__) {
          warn(
            `app.config cannot be replaced. Modify individual options instead.`
          )
        }
      },

      //app实例安装插件方法
      use(plugin: Plugin, ...options: any[]) {
        if (installedPlugins.has(plugin)) {
          __DEV__ && warn(`Plugin has already been applied to target app.`)
        } else if (plugin && isFunction(plugin.install)) {
          installedPlugins.add(plugin)
          plugin.install(app, ...options)
        } else if (isFunction(plugin)) {
          installedPlugins.add(plugin)
          plugin(app, ...options)
        } else if (__DEV__) {
          warn(
            `A plugin must either be a function or an object with an "install" ` +
              `function.`
          )
        }
        return app
      },

      //app实例mixin对象的方法
      mixin(mixin: ComponentOptions) {
        if (__FEATURE_OPTIONS_API__) {
          if (!context.mixins.includes(mixin)) {
            context.mixins.push(mixin)
          } else if (__DEV__) {
            warn(
              'Mixin has already been applied to target app' +
                (mixin.name ? `: ${mixin.name}` : '')
            )
          }
        } else if (__DEV__) {
          warn('Mixins are only available in builds supporting Options API')
        }
        return app
      },

      //app实例注册组件的方法
      component(name: string, component?: Component): any {
        if (__DEV__) {
          validateComponentName(name, context.config)
        }
        if (!component) {
          return context.components[name]
        }
        if (__DEV__ && context.components[name]) {
          warn(`Component "${name}" has already been registered in target app.`)
        }
        context.components[name] = component
        return app
      },

      //app实例注册指令的方法
      directive(name: string, directive?: Directive) {
        if (__DEV__) {
          validateDirectiveName(name)
        }

        if (!directive) {
          return context.directives[name] as any
        }
        if (__DEV__ && context.directives[name]) {
          warn(`Directive "${name}" has already been registered in target app.`)
        }
        context.directives[name] = directive
        return app
      },

      //app实例进行挂载的方法
      mount(
        rootContainer: HostElement, //挂载容器dom
        isHydrate?: boolean, //是不是服务端渲染
        isSVG?: boolean //挂载对象是不是svg
      ): any {
        
        //如果还没有挂载
        if (!isMounted) {

          //创建一个虚拟dom
          const vnode = createVNode(
            rootComponent as ConcreteComponent,
            rootProps
          )

          //将app上下文连接到根虚拟节点
          vnode.appContext = context

          // HMR root reload
          //如果是开发环境添加重载方法用于热更新
          if (__DEV__) {
            context.reload = () => {
              render(cloneVNode(vnode), rootContainer, isSVG)
            }
          }
          
          //如果是服务端渲染
          if (isHydrate && hydrate) {
            hydrate(vnode as VNode<Node, Element>, rootContainer as any)
          } else {
          //渲染节点
            render(vnode, rootContainer, isSVG)
          }

          isMounted = true
          
          
          app._container = rootContainer
          // for devtools and telemetry
          ;(rootContainer as any).__vue_app__ = app

          if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
            app._instance = vnode.component
            devtoolsInitApp(app, version)
          }

          return vnode.component!.proxy
        } else if (__DEV__) {
          warn(
            `App has already been mounted.\n` +
              `If you want to remount the same app, move your app creation logic ` +
              `into a factory function and create fresh app instances for each ` +
              `mount - e.g. \`const createMyApp = () => createApp(App)\``
          )
        }
      },

      //app实例取消挂载的方法
      unmount() {
        if (isMounted) {
          render(null, app._container)
          if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
            app._instance = null
            devtoolsUnmountApp(app)
          }
          delete app._container.__vue_app__
        } else if (__DEV__) {
          warn(`Cannot unmount an app that is not mounted.`)
        }
      },

      //app实例provide值的方法
      provide(key, value) {
        if (__DEV__ && (key as string | symbol) in context.provides) {
          warn(
            `App already provides property with key "${String(key)}". ` +
              `It will be overwritten with the new value.`
          )
        }
        // TypeScript doesn't allow symbols as index type
        // https://github.com/Microsoft/TypeScript/issues/24587
        context.provides[key as string] = value

        return app
      }
    })

    //是否进行兼容 安装一些兼容的属性
    if (__COMPAT__) {
      installAppCompatProperties(app, context, render)
    }

    return app
  }
}
