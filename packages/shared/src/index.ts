
//创建缓存映射
import { makeMap } from './makeMap'
export { makeMap }

//patch标志
export * from './patchFlags'

//组件类型标志
export * from './shapeFlags'

//插槽标志
export * from './slotFlags'

//全局白名单
export * from './globalsWhitelist'

//代码框架
export * from './codeframe'

//规范化prop
export * from './normalizeProp'

//dom 标签配置
export * from './domTagConfig'

//dom属性配置
export * from './domAttrConfig'

//脱离html
export * from './escapeHtml'

//松检查
export * from './looseEqual'

//展示字符串
export * from './toDisplayString'

/**
 * List of @babel/parser plugins that are used for template expression
 * transforms and SFC script transforms. By default we enable proposals slated
 * for ES2020. This will need to be updated as the spec moves forward.
 * Full list at https://babeljs.io/docs/en/next/babel-parser#plugins
 */
//用于模板表达式的@babel/parser 插件列表转换和 SFC 脚本转换
export const babelParserDefaultPlugins = [
  'bigInt',
  'optionalChaining',
  'nullishCoalescingOperator'
] as const

//空对象
export const EMPTY_OBJ: { readonly [key: string]: any } = __DEV__
  ? Object.freeze({})
  : {}

//空数组
export const EMPTY_ARR = __DEV__ ? Object.freeze([]) : []

//空执行
export const NOOP = () => {}


//一直返回false的函数
export const NO = () => false

//on的正则
const onRE = /^on[^a-z]/

//是不是匹配on
export const isOn = (key: string) => onRE.test(key)

export const isModelListener = (key: string) => key.startsWith('onUpdate:')

//继承属性
export const extend = Object.assign


//数组中移除属性项
export const remove = <T>(arr: T[], el: T) => {
  const i = arr.indexOf(el)
  if (i > -1) {
    arr.splice(i, 1)
  }
}

//判断是否拥有某个属性
const hasOwnProperty = Object.prototype.hasOwnProperty


//判断是否拥有某个属性
export const hasOwn = (
  val: object,
  key: string | symbol
): key is keyof typeof val => hasOwnProperty.call(val, key)

//判断是不是一个数组
export const isArray = Array.isArray

//判断是不是一个map
export const isMap = (val: unknown): val is Map<any, any> =>
  toTypeString(val) === '[object Map]'

//判断是不是一个set
export const isSet = (val: unknown): val is Set<any> =>
  toTypeString(val) === '[object Set]'

//判断是不是一个日期
export const isDate = (val: unknown): val is Date => val instanceof Date

//判断是不是一个函数
export const isFunction = (val: unknown): val is Function =>
  typeof val === 'function'

//判断是不是一个字符串
export const isString = (val: unknown): val is string => typeof val === 'string'

//判断是不是一个symbol
export const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol'

//判断是不是一个对象
export const isObject = (val: unknown): val is Record<any, any> =>
  val !== null && typeof val === 'object'

//判断是不是一个promise
export const isPromise = <T = any>(val: unknown): val is Promise<T> => {
  return isObject(val) && isFunction(val.then) && isFunction(val.catch)
}

//tostring方法
export const objectToString = Object.prototype.toString

//获取某个值的类型字符串
export const toTypeString = (value: unknown): string =>
  objectToString.call(value)

//获取原始类型
export const toRawType = (value: unknown): string => {
  // extract "RawType" from strings like "[object RawType]"
  return toTypeString(value).slice(8, -1)
}

//是不是一个纯粹的对象
export const isPlainObject = (val: unknown): val is object =>
  toTypeString(val) === '[object Object]'


//是不是一个数值类型额key
export const isIntegerKey = (key: unknown) =>
  isString(key) &&
  key !== 'NaN' &&
  key[0] !== '-' &&
  '' + parseInt(key, 10) === key

//是不是保留的prop
export const isReservedProp = /*#__PURE__*/ makeMap(
  // the leading comma is intentional so empty string "" is also included
  ',key,ref,' +
    'onVnodeBeforeMount,onVnodeMounted,' +
    'onVnodeBeforeUpdate,onVnodeUpdated,' +
    'onVnodeBeforeUnmount,onVnodeUnmounted'
)

//缓存字符串类型函数的方法
const cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
  const cache: Record<string, string> = Object.create(null)
  return ((str: string) => {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }) as any
}


const camelizeRE = /-(\w)/g


/**
 * @private
 */
//转换单词类型
export const camelize = cacheStringFunction((str: string): string => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
})

const hyphenateRE = /\B([A-Z])/g
/**
 * @private
 */
//转换单词类型
export const hyphenate = cacheStringFunction((str: string) =>
  str.replace(hyphenateRE, '-$1').toLowerCase()
)

/**
 * @private
 */
//转换单词类型
export const capitalize = cacheStringFunction(
  (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
)

/**
 * @private
 */
export const toHandlerKey = cacheStringFunction((str: string) =>
  str ? `on${capitalize(str)}` : ``
)

// compare whether a value has changed, accounting for NaN.
export const hasChanged = (value: any, oldValue: any): boolean =>
  !Object.is(value, oldValue)


//执行数组方法
export const invokeArrayFns = (fns: Function[], arg?: any) => {
  for (let i = 0; i < fns.length; i++) {
    fns[i](arg)
  }
}

//定义对象的属性
export const def = (obj: object, key: string | symbol, value: any) => {
  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: false,
    value
  })
}

//转换为数字类型
export const toNumber = (val: any): any => {
  const n = parseFloat(val)
  return isNaN(n) ? val : n
}



let _globalThis: any

//获取当前的全局对象
export const getGlobalThis = (): any => {
  return (
    _globalThis ||
    (_globalThis =
      typeof globalThis !== 'undefined'
        ? globalThis
        : typeof self !== 'undefined'
        ? self
        : typeof window !== 'undefined'
        ? window
        : typeof global !== 'undefined'
        ? global
        : {})
  )
}
