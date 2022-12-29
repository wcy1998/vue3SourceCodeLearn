

//这个入口文件是包含运行时 和 编译环境的
import { initDev } from './dev'

import { 
  compile, //编译
  CompilerOptions, //编译配置 
  CompilerError //编译错误
} from '@vue/compiler-dom'

import { 
   registerRuntimeCompiler, //注册运行时编译器
   RenderFunction, //渲染函数
   warn //告警函数
} from '@vue/runtime-dom'

//运行时domApi
import * as runtimeDom from '@vue/runtime-dom'

import { 
  isString, //是不是string类型
  NOOP, //空执行
  generateCodeFrame, //生成代码框架 
  extend  //基础对象
 } from '@vue/shared'

import { 
  InternalRenderFunction //内部渲染函数
 } from 'packages/runtime-core/src/component'


//是不是开发环境
if (__DEV__) {
  //初始化开发环境
  initDev()
}

//编译缓存
const compileCache: Record<string, RenderFunction> = Object.create(null)

//将template转换成渲染函数
function compileToFunction(
  template: string | HTMLElement, //template
  options?: CompilerOptions //编译配置
): RenderFunction {

  if (!isString(template)) {
    if (template.nodeType) {
      template = template.innerHTML
    } else {
      __DEV__ && warn(`invalid template option: `, template)
      return NOOP
    }
  }

  //如果存在编译缓存就返回
  const key = template
  const cached = compileCache[key]
  if (cached) {
    return cached
  }

  if (template[0] === '#') {
    const el = document.querySelector(template)
    if (__DEV__ && !el) {
      warn(`Template element not found or is empty: ${template}`)
    }
    // __UNSAFE__
    // Reason: potential execution of JS expressions in in-DOM template.
    // The user must make sure the in-DOM template is trusted. If it's rendered
    // by the server, the template should not contain any user data.
    template = el ? el.innerHTML : ``
  }

  //编译出代码
  const { code } = compile(
    template,
    extend(
      {
        hoistStatic: true,
        onError: __DEV__ ? onError : undefined,
        onWarn: __DEV__ ? e => onError(e, true) : NOOP
      } as CompilerOptions,
      options
    )
  )

  function onError(err: CompilerError, asWarning = false) {
    const message = asWarning
      ? err.message
      : `Template compilation error: ${err.message}`
    const codeFrame =
      err.loc &&
      generateCodeFrame(
        template as string,
        err.loc.start.offset,
        err.loc.end.offset
      )
    warn(codeFrame ? `${message}\n${codeFrame}` : message)
  }

  // The wildcard import results in a huge object with every export
  // with keys that cannot be mangled, and can be quite heavy size-wise.
  // In the global build we know `Vue` is available globally so we can avoid
  // the wildcard object.
  const render = (
    __GLOBAL__ ? new Function(code)() : new Function('Vue', code)(runtimeDom)
  ) as RenderFunction

  // mark the function as runtime compiled
  //标记当前渲染函数被编译过了
  ;(render as InternalRenderFunction)._rc = true

  return (compileCache[key] = render)
}

//注册运行时编译器
registerRuntimeCompiler(compileToFunction)
//导出编译方法
export { compileToFunction as compile }

//导出所有domApi
export * from '@vue/runtime-dom'
