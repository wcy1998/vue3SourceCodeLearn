import { RendererOptions } from '@vue/runtime-core'

export const svgNS = 'http://www.w3.org/2000/svg'

const doc = (typeof document !== 'undefined' ? document : null) as Document

const staticTemplateCache = new Map<string, DocumentFragment>()


//节点操作的相关方法
export const nodeOps: Omit<RendererOptions<Node, Element>, 'patchProp'> = {

  //插入一个节点
  insert: (child, parent, anchor) => {
    parent.insertBefore(child, anchor || null)
  },

  //移除一个节点
  remove: child => {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },

  //创建一个元素
  createElement: (tag, isSVG, is, props): Element => {
    const el = isSVG
      ? doc.createElementNS(svgNS, tag)
      : doc.createElement(tag, is ? { is } : undefined)

    if (tag === 'select' && props && props.multiple != null) {
      ;(el as HTMLSelectElement).setAttribute('multiple', props.multiple)
    }

    return el
  },

  //创建文本
  createText: text => doc.createTextNode(text),

  //创建注释
  createComment: text => doc.createComment(text),

  //设置文本
  setText: (node, text) => {
    node.nodeValue = text
  },

  //设置元素文本
  setElementText: (el, text) => {
    el.textContent = text
  },

  //获取父节点
  parentNode: node => node.parentNode as Element | null,

  //获取兄弟节点
  nextSibling: node => node.nextSibling,

  //查找元素
  querySelector: selector => doc.querySelector(selector),

  //设置作用域id
  setScopeId(el, id) {
    el.setAttribute(id, '')
  },

  //复制节点
  cloneNode(el) {
    const cloned = el.cloneNode(true)
    // #3072
    // - in `patchDOMProp`, we store the actual value in the `el._value` property.
    // - normally, elements using `:value` bindings will not be hoisted, but if
    //   the bound value is a constant, e.g. `:value="true"` - they do get
    //   hoisted.
    // - in production, hoisted nodes are cloned when subsequent inserts, but
    //   cloneNode() does not copy the custom property we attached.
    // - This may need to account for other custom DOM properties we attach to
    //   elements in addition to `_value` in the future.
    if (`_value` in el) {
      ;(cloned as any)._value = (el as any)._value
    }
    return cloned
  },

  // __UNSAFE__
  // Reason: innerHTML.
  // Static content here can only come from compiled templates.
  // As long as the user only uses trusted templates, this is safe.
  insertStaticContent(content, parent, anchor, isSVG) {
    // <parent> before | first ... last | anchor </parent>
    const before = anchor ? anchor.previousSibling : parent.lastChild
    let template = staticTemplateCache.get(content)
    if (!template) {
      const t = doc.createElement('template')
      t.innerHTML = isSVG ? `<svg>${content}</svg>` : content
      template = t.content
      if (isSVG) {
        // remove outer svg wrapper
        const wrapper = template.firstChild!
        while (wrapper.firstChild) {
          template.appendChild(wrapper.firstChild)
        }
        template.removeChild(wrapper)
      }
      staticTemplateCache.set(content, template)
    }
    parent.insertBefore(template.cloneNode(true), anchor)
    return [
      // first
      before ? before.nextSibling! : parent.firstChild!,
      // last
      anchor ? anchor.previousSibling! : parent.lastChild!
    ]
  }
}
