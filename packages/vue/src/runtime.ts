// This entry exports the runtime only, and is built as
// `dist/vue.esm-bundler.js` which is used by default for bundlers.

//打包工具默认使用的版本 只有运行时版本
import { initDev } from './dev'
import { warn } from '@vue/runtime-dom'
if (__DEV__) {
  initDev()
}

//暴露所有的domApi
export * from '@vue/runtime-dom'


//导出编译函数
export const compile = () => {
  if (__DEV__) {
    warn(
      `Runtime compilation is not supported in this build of Vue.` +
        (__ESM_BUNDLER__
          ? ` Configure your bundler to alias "vue" to "vue/dist/vue.esm-bundler.js".`
          : __ESM_BROWSER__
          ? ` Use "vue.esm-browser.js" instead.`
          : __GLOBAL__
          ? ` Use "vue.global.js" instead.`
          : ``) /* should not happen */
    )
  }
}
