import {
  currentInstance,
  ConcreteComponent,
  ComponentOptions,
  getComponentName
} from '../component'
import { currentRenderingInstance } from '../componentRenderContext'
import { Directive } from '../directives'
import { camelize, capitalize, isString } from '@vue/shared'
import { warn } from '../warning'
import { VNodeTypes } from '../vnode'

export const COMPONENTS = 'components'
export const DIRECTIVES = 'directives'
export const FILTERS = 'filters'

export type AssetTypes = typeof COMPONENTS | typeof DIRECTIVES | typeof FILTERS

/**
 * @private
 */
export function resolveComponent(
  name: string,
  maybeSelfReference?: boolean
): ConcreteComponent | string {
  return resolveAsset(COMPONENTS, name, true, maybeSelfReference) || name
}


export const NULL_DYNAMIC_COMPONENT = Symbol()

/**
 * @private
 */
//解析动态组件
export function resolveDynamicComponent(component: unknown): VNodeTypes {
  //如果传入的是字符串
  if (isString(component)) {
    return resolveAsset(COMPONENTS, component, false) || component
  } else 
  //传入组件直接返回
  {
    // invalid types will fallthrough to createVNode and raise warning
    return (component || NULL_DYNAMIC_COMPONENT) as any
  }
}

/**
 * @private
 */
export function resolveDirective(name: string): Directive | undefined {
  return resolveAsset(DIRECTIVES, name)
}

/**
 * v2 compat only
 * @internal
 */
export function resolveFilter(name: string): Function | undefined {
  return resolveAsset(FILTERS, name)
}

/**
 * @private
 * overload 1: components
 */
function resolveAsset(
  type: typeof COMPONENTS,
  name: string,
  warnMissing?: boolean,
  maybeSelfReference?: boolean
): ConcreteComponent | undefined
// overload 2: directives
function resolveAsset(
  type: typeof DIRECTIVES,
  name: string
): Directive | undefined
// implementation
// overload 3: filters (compat only)
function resolveAsset(type: typeof FILTERS, name: string): Function | undefined
// implementation


function resolveAsset(
  type: AssetTypes, //资源类型
  name: string, //资源名称
  warnMissing = true, //是不是进行提示
  maybeSelfReference = false //是不是自引用
) {

  //获取当前的组件实例
  const instance = currentRenderingInstance || currentInstance

  if (instance) {

    //获取当前组件实例的 组件配置
    const Component = instance.type

    // 明确的组件名有最高优先级
    //如果是获取组件资源
    if (type === COMPONENTS) {
      
      //获取当前组件实例的组件名
      const selfName = getComponentName(Component)

      //如果匹配了就返回组件信息
      if (
        selfName &&
        (selfName === name ||
          selfName === camelize(name) ||
          selfName === capitalize(camelize(name)))
      ) {
        return Component
      }
    }

    //在组件的注册组件中进行查找 和 全局组件中 进行查找
    const res =
      // local registration
      // check instance[type] first which is resolved for options API
      resolve(instance[type] || (Component as ComponentOptions)[type], name) ||
      // global registration
      resolve(instance.appContext[type], name)


    if (!res && maybeSelfReference) {
      // fallback to implicit self-reference
      return Component
    }

    if (__DEV__ && warnMissing && !res) {
      warn(`Failed to resolve ${type.slice(0, -1)}: ${name}`)
    }

    return res
  } else if (__DEV__) {
    warn(
      `resolve${capitalize(type.slice(0, -1))} ` +
        `can only be used in render() or setup().`
    )
  }
}

function resolve(registry: Record<string, any> | undefined, name: string) {
  return (
    registry &&
    (registry[name] ||
      registry[camelize(name)] ||
      registry[capitalize(camelize(name))])
  )
}
