

//核心api
// Core API ------------------------------------------------------------------
export const version = __VERSION__

//暴露的响应式api
export {
            
  //核心api
  computed,
  reactive,
  ref,
  readonly,

  // 工具函数
  unref,
  proxyRefs,
  isRef,
  toRef,
  toRefs,
  isProxy,
  isReactive,
  isReadonly,


  // 高级函数
  customRef,
  triggerRef,
  shallowRef,
  shallowReactive,
  shallowReadonly,
  markRaw,
  toRaw,

  // 副作用函数
  effect,
  stop,
  ReactiveEffect,

  //副作用作用域
  effectScope,
  EffectScope,
  getCurrentScope,
  onScopeDispose
} from '@vue/reactivity'


//watch相关的api
export {
  watch,
  watchEffect,
  watchPostEffect,
  watchSyncEffect
} from './apiWatch'


//生命周期钩子
export {
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  onActivated,
  onDeactivated,
  onRenderTracked,
  onRenderTriggered,
  onErrorCaptured,
  onServerPrefetch
} from './apiLifecycle'

//provide inject
export { provide, inject } from './apiInject'

//nexttick
export { nextTick } from './scheduler'

//定义一个组件
export { defineComponent } from './apiDefineComponent'

//定义一个异步组件
export { defineAsyncComponent } from './apiAsyncComponent'

//使用插槽 和 穿透属性
export { useAttrs, useSlots } from './apiSetupHelpers'


// <script setup> API ----------------------------------------------------------

export {

  //ts相关api
  // macros runtime, for typing and warnings only
  defineProps,
  defineEmits,
  defineExpose,
  withDefaults,

  // internal
  mergeDefaults,
  withAsyncContext
} from './apiSetupHelpers'



//进阶api
// Advanced API ----------------------------------------------------------------

// For getting a hold of the internal instance in setup() - useful for advanced
// plugins
//获取当前实例
export { getCurrentInstance } from './component'

// For raw render function users
//原生渲染函数
export { h } from './h'

// Advanced render function utilities
//渲染函数api
export { createVNode, cloneVNode, mergeProps, isVNode } from './vnode'


// VNode types
//虚拟节点的类型
export { Fragment, Text, Comment, Static } from './vnode'

// Built-in components
//内置组件
export { Teleport, TeleportProps } from './components/Teleport'
export { Suspense, SuspenseProps } from './components/Suspense'
export { KeepAlive, KeepAliveProps } from './components/KeepAlive'
export {
  BaseTransition,
  BaseTransitionProps
} from './components/BaseTransition'


// For using custom directives
//自定义指令使用
export { withDirectives } from './directives'


// SSR context
//服务端渲染上下文
export { useSSRContext, ssrContextKey } from './helpers/useSsrContext'


// Custom Renderer API ---------------------------------------------------------
//自定义渲染器相关api
export { createRenderer, createHydrationRenderer } from './renderer'

export { queuePostFlushCb } from './scheduler'

export { warn } from './warning'

export {
  handleError,
  callWithErrorHandling,
  callWithAsyncErrorHandling,
  ErrorCodes
} from './errorHandling'

export {
  resolveComponent,
  resolveDirective,
  resolveDynamicComponent
} from './helpers/resolveAssets'

// For integration with runtime compiler
export { registerRuntimeCompiler, isRuntimeOnly } from './component'

export {
  useTransitionState,
  resolveTransitionHooks,
  setTransitionHooks,
  getTransitionRawChildren
} from './components/BaseTransition'

export { initCustomFormatter } from './customFormatter'

// For devtools
export { devtools, setDevtoolsHook } from './devtools'



// Types -------------------------------------------------------------------------

import { VNode } from './vnode'
import { ComponentInternalInstance } from './component'

// Augment Ref unwrap bail types.
// Note: if updating this, also update `types/refBail.d.ts`.
declare module '@vue/reactivity' {
  export interface RefUnwrapBailTypes {
    runtimeCoreBailTypes:
      | VNode
      | {
          // directly bailing on ComponentPublicInstance results in recursion
          // so we use this as a bail hint
          $: ComponentInternalInstance
        }
  }
}

export {
  ReactiveEffectOptions,
  DebuggerEvent,
  TrackOpTypes,
  TriggerOpTypes,
  Ref,
  ComputedRef,
  WritableComputedRef,
  UnwrapRef,
  ShallowUnwrapRef,
  WritableComputedOptions,
  ToRefs,
  DeepReadonly
} from '@vue/reactivity'

export {
  WatchEffect,
  WatchOptions,
  WatchOptionsBase,
  WatchCallback,
  WatchSource,
  WatchStopHandle
} from './apiWatch'
export { InjectionKey } from './apiInject'
export {
  App,
  AppConfig,
  AppContext,
  Plugin,
  CreateAppFunction,
  OptionMergeFunction
} from './apiCreateApp'

export {
  VNode,
  VNodeChild,
  VNodeTypes,
  VNodeProps,
  VNodeArrayChildren,
  VNodeNormalizedChildren
} from './vnode'

export {
  Component,
  ConcreteComponent,
  FunctionalComponent,
  ComponentInternalInstance,
  SetupContext,
  ComponentCustomProps,
  AllowedComponentProps
} from './component'

export { DefineComponent } from './apiDefineComponent'
export {
  ComponentOptions,
  ComponentOptionsMixin,
  ComponentOptionsWithoutProps,
  ComponentOptionsWithObjectProps,
  ComponentOptionsWithArrayProps,
  ComponentCustomOptions,
  ComponentOptionsBase,
  RenderFunction,
  MethodOptions,
  ComputedOptions,
  RuntimeCompilerOptions
} from './componentOptions'

export { EmitsOptions, ObjectEmitsOptions } from './componentEmits'

export {
  ComponentPublicInstance,
  ComponentCustomProperties,
  CreateComponentPublicInstance
} from './componentPublicInstance'

export {
  Renderer,
  RendererNode,
  RendererElement,
  HydrationRenderer,
  RendererOptions,
  RootRenderFunction
} from './renderer'

export { RootHydrateFunction } from './hydration'

export { Slot, Slots } from './componentSlots'

export {
  Prop,
  PropType,
  ComponentPropsOptions,
  ComponentObjectPropsOptions,
  ExtractPropTypes,
  ExtractDefaultPropTypes
} from './componentProps'

export {
  Directive,
  DirectiveBinding,
  DirectiveHook,
  ObjectDirective,
  FunctionDirective,
  DirectiveArguments
} from './directives'

export { SuspenseBoundary } from './components/Suspense'

export { TransitionState, TransitionHooks } from './components/BaseTransition'

export {
  AsyncComponentOptions,
  AsyncComponentLoader
} from './apiAsyncComponent'

export { HMRRuntime } from './hmr'

// Internal API ----------------------------------------------------------------
//暴露的一些内部api 可能在版本切换后不进行提示 用户代码要避免依赖他们
// **IMPORTANT** Internal APIs may change without notice between versions and
// user code should avoid relying on them.

// For compiler generated code
// should sync with '@vue/compiler-core/src/runtimeHelpers.ts'
export {
  withCtx,
  pushScopeId,
  popScopeId,
  withScopeId
} from './componentRenderContext'
export { renderList } from './helpers/renderList'
export { toHandlers } from './helpers/toHandlers'
export { renderSlot } from './helpers/renderSlot'
export { createSlots } from './helpers/createSlots'
export { withMemo, isMemoSame } from './helpers/withMemo'
export {
  openBlock,
  createBlock,
  setBlockTracking,
  createTextVNode,
  createCommentVNode,
  createStaticVNode,
  createElementVNode,
  createElementBlock,
  guardReactiveProps
} from './vnode'
export {
  toDisplayString,
  camelize,
  capitalize,
  toHandlerKey,
  normalizeProps,
  normalizeClass,
  normalizeStyle
} from '@vue/shared'

// For test-utils
export { transformVNodeArgs } from './vnode'

// SSR -------------------------------------------------------------------------

// **IMPORTANT** These APIs are exposed solely for @vue/server-renderer and may
// change without notice between versions. User code should never rely on them.

import { createComponentInstance, setupComponent } from './component'
import { renderComponentRoot } from './componentRenderUtils'
import { setCurrentRenderingInstance } from './componentRenderContext'
import { isVNode, normalizeVNode } from './vnode'

const _ssrUtils = {
  createComponentInstance,
  setupComponent,
  renderComponentRoot,
  setCurrentRenderingInstance,
  isVNode,
  normalizeVNode
}

/**
 * SSR utils for \@vue/server-renderer. Only exposed in cjs builds.
 * @internal
 */
export const ssrUtils = (
  __NODE_JS__ || __ESM_BUNDLER__ ? _ssrUtils : null
) as typeof _ssrUtils




// 2.x COMPAT ------------------------------------------------------------------

export { DeprecationTypes } from './compat/compatConfig'
export { CompatVue } from './compat/global'
export { LegacyConfig } from './compat/globalConfig'

import { warnDeprecation } from './compat/compatConfig'
import { createCompatVue } from './compat/global'
import {
  isCompatEnabled,
  checkCompatEnabled,
  softAssertCompatEnabled
} from './compat/compatConfig'
import { resolveFilter as _resolveFilter } from './helpers/resolveAssets'

/**
 * @internal only exposed in compat builds
 */
export const resolveFilter = __COMPAT__ ? _resolveFilter : null

const _compatUtils = {
  warnDeprecation,
  createCompatVue,
  isCompatEnabled,
  checkCompatEnabled,
  softAssertCompatEnabled
}

/**
 * @internal only exposed in compat builds.
 */
export const compatUtils = (
  __COMPAT__ ? _compatUtils : null
) as typeof _compatUtils

// Ref sugar macros ------------------------------------------------------------
// for dts generation only
export { $ref, $computed, $raw, $fromRefs } from './helpers/refSugar'
