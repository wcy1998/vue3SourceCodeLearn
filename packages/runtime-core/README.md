


# @vue/runtime-core
//这个包只用于自定义渲染器不是使用在应用中的
> This package is published only for typing and building custom renderers. It is NOT meant to be used in applications.

//可以在src/index.ts文件中查看所有暴露的api
For full exposed APIs, see `src/index.ts`. You can also run `yarn build runtime-core --types` from repo root, which will generate an API report at `temp/runtime-core.api.md`.



//创建一个自定义的渲染器
## Building a Custom Renderer

``` ts
import { createRenderer } from '@vue/runtime-core'

const { render, createApp } = createRenderer({
  patchProp,
  insert,
  remove,
  createElement,
  // ...
})


// `render` is the low-level API
// `createApp` returns an app instance with configurable context shared
// by the entire app tree.
export { render, createApp }

export * from '@vue/runtime-core'
```

//查看vue/runtime-dom 了解一个 dom渲染器是如何被实现的
See `@vue/runtime-dom` for how a DOM-targeting renderer is implemented.
