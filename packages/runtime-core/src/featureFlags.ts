import { getGlobalThis } from '@vue/shared'


//这个只在esm打包器构建时调用 
//当渲染器创建时被调用 所以导入runtime-core时是没有副作用的
export function initFeatureFlags() {
  
  let needWarn = false
   
  //如果没有设置__FEATURE_OPTIONS_API__全局标志，__VUE_OPTIONS_API__开启
  if (typeof __FEATURE_OPTIONS_API__ !== 'boolean') {
    needWarn = true
    getGlobalThis().__VUE_OPTIONS_API__ = true
  }
  
  //如果没有设置生成环境的开发工具 将生成环境开发工具的标志关闭
  if (typeof __FEATURE_PROD_DEVTOOLS__ !== 'boolean') {
    needWarn = true
    getGlobalThis().__VUE_PROD_DEVTOOLS__ = false
  }

  //如果是开发环境
  if (__DEV__ && needWarn) {
    console.warn(
      `You are running the esm-bundler build of Vue. It is recommended to ` +
        `configure your bundler to explicitly replace feature flag globals ` +
        `with boolean literals to get proper tree-shaking in the final bundle. ` +
        `See http://link.vuejs.org/feature-flags for more details.`
    )
  }
}
