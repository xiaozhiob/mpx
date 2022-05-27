import builtInKeysMap from '../builtInKeysMap'
import mergeOptions from '../../../core/mergeOptions'
import MpxProxy from '../../../core/proxy'
import { diffAndCloneA } from '../../../helper/utils'

function filterOptions (options) {
  const newOptions = {}
  Object.keys(options).forEach(key => {
    if (builtInKeysMap[key]) {
      return
    }
    if (key === 'data' || key === 'dataFn') {
      newOptions.data = function mergeFn () {
        return Object.assign(
          diffAndCloneA(options.data || {}).clone,
          options.dataFn && options.dataFn.call(this)
        )
      }
    } else {
      newOptions[key] = options[key]
    }
  })
  return newOptions
}

function initProxy (context, rawOptions) {
  if (!context.__mpxProxy) {
    // 创建proxy对象
    context.__mpxProxy = new MpxProxy(rawOptions, context)
    context.__mpxProxy.created()
  } else if (context.__mpxProxy.isDestroyed()) {
    context.__mpxProxy = new MpxProxy(rawOptions, context, true)
    context.__mpxProxy.created()
  }
}

export function getDefaultOptions (type, { rawOptions = {} }) {
  const rootMixins = [{
    created () {
      initProxy(this, rawOptions)
    },
    mounted () {
      if (this.__mpxProxy) this.__mpxProxy.mounted()
    },
    updated () {
      if (this.__mpxProxy) this.__mpxProxy.updated()
    },
    destroyed () {
      if (this.__mpxProxy) this.__mpxProxy.destroyed()
    }
  }]
  // 为了在builtMixin中可以使用某些rootMixin实现的特性（如数据响应等），此处builtInMixin在rootMixin之后执行，但是当builtInMixin使用存在对应内建生命周期的目标平台声明周期写法时，可能会出现用户生命周期比builtInMixin中的生命周期先执行的情况，为了避免这种情况发生，builtInMixin应该尽可能使用内建生命周期来编写
  rawOptions.mixins = rawOptions.mixins ? rootMixins.concat(rawOptions.mixins) : rootMixins
  rawOptions = mergeOptions(rawOptions, type, false)
  return filterOptions(rawOptions)
}
