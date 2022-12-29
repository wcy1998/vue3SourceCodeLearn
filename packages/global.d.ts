// Global compile-time constants
declare var __DEV__: boolean      //开发标志
declare var __TEST__: boolean     //测试标志
declare var __BROWSER__: boolean  //浏览器标志
declare var __GLOBAL__: boolean   //全局标志
declare var __ESM_BUNDLER__: boolean  //esm  bundler标志
declare var __ESM_BROWSER__: boolean  //esm 浏览器标志
declare var __NODE_JS__: boolean  //node标志
declare var __COMMIT__: string   //提交标志
declare var __VERSION__: string  //版本标志
declare var __COMPAT__: boolean  //兼容标志

// Feature flags
declare var __FEATURE_OPTIONS_API__: boolean  //是不是支持 optionsApi
declare var __FEATURE_PROD_DEVTOOLS__: boolean //是不是 生产环境开发工具
declare var __FEATURE_SUSPENSE__: boolean  //是不是支持 suspense

// for tests
declare namespace jest {
  interface Matchers<R, T> {
    toHaveBeenWarned(): R
    toHaveBeenWarnedLast(): R
    toHaveBeenWarnedTimes(n: number): R
  }
}

declare module '*.vue' {}
declare module '*?raw' {
  const content: string
  export default content
}

declare module 'file-saver' {
  export function saveAs(blob: any, name: any): void
}

declare module 'stream/web' {
  const r: typeof ReadableStream
  const t: typeof TransformStream
  export { r as ReadableStream, t as TransformStream }
}
