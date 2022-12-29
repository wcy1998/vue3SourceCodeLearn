import {
  extend,
  looseEqual,
  looseIndexOf,
  NOOP,
  toDisplayString,
  toNumber
} from '@vue/shared'
import {
  ComponentPublicInstance,
  PublicPropertiesMap
} from '../componentPublicInstance'
import { getCompatChildren } from './instanceChildren'
import {
  DeprecationTypes,
  assertCompatEnabled,
  isCompatEnabled
} from './compatConfig'
import { off, on, once } from './instanceEventEmitter'
import { getCompatListeners } from './instanceListeners'
import { shallowReadonly } from '@vue/reactivity'
import { legacySlotProxyHandlers } from './componentFunctional'
import { compatH } from './renderFn'
import { createCommentVNode, createTextVNode } from '../vnode'
import { renderList } from '../helpers/renderList'
import {
  legacyBindDynamicKeys,
  legacyBindObjectListeners,
  legacyBindObjectProps,
  legacyCheckKeyCodes,
  legacyMarkOnce,
  legacyPrependModifier,
  legacyRenderSlot,
  legacyRenderStatic,
  legacyresolveScopedSlots
} from './renderHelpers'
import { resolveFilter } from '../helpers/resolveAssets'
import { InternalSlots, Slots } from '../componentSlots'
import { ContextualRenderFn } from '../componentRenderContext'
import { resolveMergedOptions } from '../componentOptions'

export type LegacyPublicInstance = ComponentPublicInstance &
  LegacyPublicProperties

export interface LegacyPublicProperties {
  $set(target: object, key: string, value: any): void
  $delete(target: object, key: string): void
  $mount(el?: string | Element): this
  $destroy(): void
  $scopedSlots: Slots
  $on(event: string | string[], fn: Function): this
  $once(event: string, fn: Function): this
  $off(event?: string | string[], fn?: Function): this
  $children: LegacyPublicProperties[]
  $listeners: Record<string, Function | Function[]>
}


//安装一些兼容vue2的公开属性
export function installCompatInstanceProperties(map: PublicPropertiesMap) {
  const set = (target: any, key: any, val: any) => {
    target[key] = val
  }

  const del = (target: any, key: any) => {
    delete target[key]
  }

  extend(map, {
    $set: i => {  //$set
      assertCompatEnabled(DeprecationTypes.INSTANCE_SET, i)
      return set
    },

    $delete: i => {   //$delete
      assertCompatEnabled(DeprecationTypes.INSTANCE_DELETE, i)
      return del
    },

    $mount: i => {  //$mount
      assertCompatEnabled(
        DeprecationTypes.GLOBAL_MOUNT,
        null /* this warning is global */
      )
      // root mount override from ./global.ts in installCompatMount
      return i.ctx._compat_mount || NOOP
    },

    $destroy: i => { //$destroy
      assertCompatEnabled(DeprecationTypes.INSTANCE_DESTROY, i)
      // root destroy override from ./global.ts in installCompatMount
      return i.ctx._compat_destroy || NOOP
    },

    // overrides existing accessor
    $slots: i => {  //$slots
      if (
        isCompatEnabled(DeprecationTypes.RENDER_FUNCTION, i) &&
        i.render &&
        i.render._compatWrapped
      ) {
        return new Proxy(i.slots, legacySlotProxyHandlers)
      }
      return __DEV__ ? shallowReadonly(i.slots) : i.slots
    },

    $scopedSlots: i => {  //$scopedSlots
      assertCompatEnabled(DeprecationTypes.INSTANCE_SCOPED_SLOTS, i)
      const res: InternalSlots = {}
      for (const key in i.slots) {
        const fn = i.slots[key]!
        if (!(fn as ContextualRenderFn)._ns /* non-scoped slot */) {
          res[key] = fn
        }
      }
      return res
    },

    $on: i => on.bind(null, i), //$on
    $once: i => once.bind(null, i), //$once
    $off: i => off.bind(null, i),//$off

    $children: getCompatChildren, //$children
    $listeners: getCompatListeners //$listeners
  } as PublicPropertiesMap)

  /* istanbul ignore if */
  if (isCompatEnabled(DeprecationTypes.PRIVATE_APIS, null)) {
    extend(map, {
      // needed by many libs / render fns
      $vnode: i => i.vnode,  //$vnode

      // inject addtional properties into $options for compat
      // e.g. vuex needs this.$options.parent
      $options: i => {  //$options
        const res = extend({}, resolveMergedOptions(i))
        res.parent = i.proxy!.$parent
        res.propsData = i.vnode.props
        return res
      },

      // some private properties that are likely accessed...
      _self: i => i.proxy,    //_self
      _uid: i => i.uid,     //_uid
      _data: i => i.data,   //_data
      _isMounted: i => i.isMounted,  //_isMounted
      _isDestroyed: i => i.isUnmounted, //_isDestroyed

      // v2 render helpers
      $createElement: () => compatH,  //$createElement
      _c: () => compatH,  //_c
      _o: () => legacyMarkOnce, //_o
      _n: () => toNumber, //_n
      _s: () => toDisplayString,  //_s
      _l: () => renderList,  //_l
      _t: i => legacyRenderSlot.bind(null, i), //_t
      _q: () => looseEqual,  //_q
      _i: () => looseIndexOf,  //_i
      _m: i => legacyRenderStatic.bind(null, i), //_m
      _f: () => resolveFilter, //_f
      _k: i => legacyCheckKeyCodes.bind(null, i), //_k
      _b: () => legacyBindObjectProps,//_b
      _v: () => createTextVNode, //_v
      _e: () => createCommentVNode, //_e
      _u: () => legacyresolveScopedSlots, //_u
      _g: () => legacyBindObjectListeners, //_g
      _d: () => legacyBindDynamicKeys, //_d
      _p: () => legacyPrependModifier //_p
    } as PublicPropertiesMap)
  }
}
