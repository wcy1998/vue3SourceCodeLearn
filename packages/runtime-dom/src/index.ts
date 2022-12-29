

import {
  createRenderer,
  createHydrationRenderer,
  warn,
  RootRenderFunction,
  CreateAppFunction,
  Renderer,
  HydrationRenderer,
  App,
  RootHydrateFunction,
  isRuntimeOnly,
  DeprecationTypes,
  compatUtils
} from '@vue/runtime-core'


import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'

// Importing from the compiler, will be tree-shaken in prod
//从编译器导入 在生产环境会被treeshake掉
import { isFunction, isString, isHTMLTag, isSVGTag, extend } from '@vue/shared'

//声明响应式包
declare module '@vue/reactivity' {
  export interface RefUnwrapBailTypes {
    // Note: if updating this, also update `types/refBail.d.ts`.
    runtimeDOMBailTypes: Node | Window
  }
}

//渲染器配置
const rendererOptions = extend({ patchProp }, nodeOps)


// lazy  create the renderer -this makes core renderer logic tree-shakable
// in case the user only imports reactivity utilities from Vue.
//懒创建渲染器，这是渲染器的逻辑是可以被treeshake的，防止有人只想使用Vue中的响应式功能
let renderer: Renderer<Element | ShadowRoot> | HydrationRenderer


//服务端渲染相关
let enabledHydration = false

//确认渲染器
function ensureRenderer() {
  return (
    renderer ||
    (renderer = createRenderer<Node, Element | ShadowRoot>(rendererOptions))
  )
}

//确认服务端渲染器
function ensureHydrationRenderer() {
  renderer = enabledHydration
    ? renderer
    : createHydrationRenderer(rendererOptions)
  enabledHydration = true
  return renderer as HydrationRenderer
}

// use explicit type casts here to avoid import() calls in rolled-up d.ts
//在这里使用显式类型强制转换以避免在rollup的d.t ts中调用import()
export const render = ((...args) => {
  ensureRenderer().render(...args)
}) as RootRenderFunction<Element | ShadowRoot>

export const hydrate = ((...args) => {
  ensureHydrationRenderer().hydrate(...args)
}) as RootHydrateFunction


//创建vue根实例
export const createApp = ((...args) => {
  
  //创建app实例
  const app = ensureRenderer().createApp(...args)

  //开发环境下 注入原生tag检测 编译选项检测
  if (__DEV__) {
    injectNativeTagCheck(app)
    injectCompilerOptionsCheck(app)
  }
  
  //获取mount方法
  const { mount } = app
  
  //包装app的mount方法
  app.mount = (containerOrSelector: Element | ShadowRoot | string): any => {

    //规范化挂载对象
    const container = normalizeContainer(containerOrSelector)
    
    //不存在就挂载失败
    if (!container) return
    
    //获取app的组件
    const component = app._component
      

    //如果组件不是一个方法 且 不存在render方法 且 不存在template
    if (!isFunction(component) && !component.render && !component.template) {
      // __UNSAFE__
      // Reason: potential execution of JS expressions in in-DOM template.
      // The user must make sure the in-DOM template is trusted. If it's
      // rendered by the server, the template should not contain any user data.
      component.template = container.innerHTML
      // 2.x compat check
      if (__COMPAT__ && __DEV__) {
        for (let i = 0; i < container.attributes.length; i++) {
          const attr = container.attributes[i]
          if (attr.name !== 'v-cloak' && /^(v-|:|@)/.test(attr.name)) {
            compatUtils.warnDeprecation(
              DeprecationTypes.GLOBAL_MOUNT_CONTAINER,
              null
            )
            break
          }
        }
      }
    }

    //挂载前清空元素内容
    container.innerHTML = ''
 
    
    const proxy = mount(container, false, container instanceof SVGElement)

    if (container instanceof Element) {
      container.removeAttribute('v-cloak')
      container.setAttribute('data-v-app', '')
    }

    return proxy
    
  }

  return app
}) as CreateAppFunction<Element>

//创建服务端根实例
export const createSSRApp = ((...args) => {
  const app = ensureHydrationRenderer().createApp(...args)

  if (__DEV__) {
    injectNativeTagCheck(app)
    injectCompilerOptionsCheck(app)
  }

  const { mount } = app
  app.mount = (containerOrSelector: Element | ShadowRoot | string): any => {
    const container = normalizeContainer(containerOrSelector)
    if (container) {
      return mount(container, true, container instanceof SVGElement)
    }
  }

  return app
}) as CreateAppFunction<Element>


//注入原生tag检测
function injectNativeTagCheck(app: App) {
  // Inject `isNativeTag`
  // this is used for component name validation (dev only)
  Object.defineProperty(app.config, 'isNativeTag', {
    value: (tag: string) => isHTMLTag(tag) || isSVGTag(tag),
    writable: false
  })
}

// dev only
//注册编译选项检测
function injectCompilerOptionsCheck(app: App) {

  //只有运行时环境是
  if (isRuntimeOnly()) {

    //判断是不是自定义元素
    const isCustomElement = app.config.isCustomElement

    Object.defineProperty(app.config, 'isCustomElement', {
      get() {
        return isCustomElement
      },
      set() {
        warn(
          `The \`isCustomElement\` config option is deprecated. Use ` +
            `\`compilerOptions.isCustomElement\` instead.`
        )
      }
    })


    const compilerOptions = app.config.compilerOptions
    const msg =
      `The \`compilerOptions\` config option is only respected when using ` +
      `a build of Vue.js that includes the runtime compiler (aka "full build"). ` +
      `Since you are using the runtime-only build, \`compilerOptions\` ` +
      `must be passed to \`@vue/compiler-dom\` in the build setup instead.\n` +
      `- For vue-loader: pass it via vue-loader's \`compilerOptions\` loader option.\n` +
      `- For vue-cli: see https://cli.vuejs.org/guide/webpack.html#modifying-options-of-a-loader\n` +
      `- For vite: pass it via @vitejs/plugin-vue options. See https://github.com/vitejs/vite/tree/main/packages/plugin-vue#example-for-passing-options-to-vuecompiler-dom`

    Object.defineProperty(app.config, 'compilerOptions', {
      get() {
        warn(msg)
        return compilerOptions
      },
      set() {
        warn(msg)
      }
    })
  }
}

//规范化挂载对象
function normalizeContainer(
  container: Element | ShadowRoot | string
): Element | null {
  if (isString(container)) {
    const res = document.querySelector(container)
    if (__DEV__ && !res) {
      warn(
        `Failed to mount app: mount target selector "${container}" returned null.`
      )
    }
    return res
  }
  if (
    __DEV__ &&
    window.ShadowRoot &&
    container instanceof window.ShadowRoot &&
    container.mode === 'closed'
  ) {
    warn(
      `mounting on a ShadowRoot with \`{mode: "closed"}\` may lead to unpredictable bugs`
    )
  }
  return container as any
}


//自定义元素支持
// Custom element support
export {
  defineCustomElement,
  defineSSRCustomElement,
  VueElement,
  VueElementConstructor
} from './apiCustomElement'

// SFC CSS utilities
//单文件组件的css工具
export { useCssModule } from './helpers/useCssModule'
export { useCssVars } from './helpers/useCssVars'

// DOM-only components
//只在dom环境 支持的 内置组件
export { Transition, TransitionProps } from './components/Transition'
export {
  TransitionGroup,
  TransitionGroupProps
} from './components/TransitionGroup'



// **Internal** DOM-only runtime directive helpers
//内部的dom环境支持的 指令帮助
export {
  vModelText,
  vModelCheckbox,
  vModelRadio,
  vModelSelect,
  vModelDynamic
} from './directives/vModel'
export { withModifiers, withKeys } from './directives/vOn'
export { vShow } from './directives/vShow'

//导出运行时核心包的所有api 像是渲染函数  组件  响应式api nexttick  标志 类型
export * from '@vue/runtime-core'
