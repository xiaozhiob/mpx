import { noop, isBoolean, isString, hasOwn, makeMap, dash2hump, hump2dash, warn } from '@mpxjs/utils'

const _createSelectorQuery = (runCb) => {
  return {
    exec: (cb = noop) => {
      runCb().then(res => {
        res = [res]
        cb(res)
      })
    },
    in: () => {
      warn('please use wx:ref to get NodesRef')
    },
    select: () => {
      warn('please use wx:ref to get NodesRef')
    },
    selectAll: () => {
      warn('please use wx:ref to get NodesRef')
    },
    selectViewport: () => { // 有点难实现，dimension 目前没有暴露相关 api
      warn('please use wx:ref')
    }
  }
}

const flushRefFns = (fns) => {
  return Promise.all(fns.map(fn => fn())).then((res) => {
    return res.reduce((preVal, curVal) => {
      return Object.assign(preVal, curVal)
    }, {})
  })
}

const wrapFn = (fn) => {
  return () => {
    return new Promise((resolve) => {
      fn(resolve)
    })
  }
}

const createMeasureObj = (nodeRef, props) => {
  const allProps = new Set()
  return {
    addProps (prop) {
      if (isString(prop)) {
        prop = [prop]
      }
      prop.forEach(item => allProps.add(item))
    },
    measure () {
      // 如果 nodeRef 部署了 measure 接口，优先使用 measure 去计算，否则从 style 上获取
      if (nodeRef.measure) {
        return new Promise((resolve) => {
          setTimeout(() => {
            nodeRef.measure(function (x, y, width, height, pageX, pageY) {
              const rectAndSize = {
                width,
                height,
                left: pageX,
                top: pageY,
                right: pageX + width,
                bottom: pageY + height
              }
              const result = [...allProps].reduce((preVal, key) => {
                return Object.assign(preVal, { [key]: rectAndSize[key] || 0 })
              }, {})
              resolve(result)
            })
          }, 10)
        })
      } else {
        return getComputedStyle([...allProps], props, 0)()
      }
    }
  }
}

const datasetReg = /^data-(.+)$/

const getDataset = (props) => {
  return wrapFn((resolve) => {
    const dataset = {}
    for (const key in props) {
      if (hasOwn(props, key)) {
        const matched = datasetReg.exec(key)
        if (matched) {
          dataset[matched[1]] = props[key]
        }
      }
    }
    resolve({ dataset })
  })
}

const getPlainProps = (config, props) => {
  return wrapFn((resolve) => {
    const res = {}
    for (const key in config) {
      res[dash2hump(key)] = props[key] || props[hump2dash(key)]
    }
    resolve(res)
  })
}

const getComputedStyle = (config, props, defaultVal = '') => {
  // 从 props.style 上获取
  return wrapFn((resolve) => {
    const styles = props.style || []
    const res = {}
    config.forEach((key) => {
      // 后序遍历，取到就直接返回
      let length = styles.length - 1
      res[key] = defaultVal
      while (length >= 0) {
        const styleObj = styles[length--]
        // 取 style 的 key 是根据传入的 key 来设置，传什么设置什么，取值需要做兼容
        const humpKey = dash2hump(key)
        if (hasOwn(styleObj, key) || hasOwn(styleObj, humpKey)) {
          res[key] = styleObj[key] || styleObj[humpKey]
          break
        }
      }
    })
    resolve(res)
  })
}

const getInstanceConfig = (config, instance) => {
  return wrapFn((resolve) => {
    resolve({ [config]: instance[config] || {} })
  })
}

const getScrollOffsetFallback = (cb) => {
  const res = {
    scrollLeft: 0,
    scrollTop: 0,
    scrollHeight: 0,
    scrollWidth: 0
  }
  cb(res)
}

const RECT = ['left', 'top', 'right', 'bottom']
const SIZE = ['width', 'height']

export default function createNodesRef (props, instance) {
  const nodeRef = instance.nodeRef

  const fields = (config, cb = noop) => {
    const plainProps = {}
    const fns = []
    let measureObj = null

    const addMeasureProps = (prop) => {
      if (!measureObj) {
        measureObj = createMeasureObj(nodeRef, props)
        fns.push(measureObj.measure)
      }
      measureObj.addProps(prop)
    }

    for (const key in config) {
      const value = config[key]
      if (Array.isArray(value) && value.length) {
        if (key === 'properties') {
          Object.assign(plainProps, makeMap(value))
        } else if (key === 'computedStyle') {
          const computedStyle = config.computedStyle
          for (let i = computedStyle.length - 1; i >= 0; i--) {
            const style = computedStyle[i]
            if (RECT.includes(style) || SIZE.includes(style)) {
              addMeasureProps(style)
              computedStyle.splice(i, 1)
            }
          }
          if (computedStyle.length) {
            fns.push(getComputedStyle(computedStyle, props))
          }
        }
      } else if (isBoolean(value) && value) {
        switch (key) {
          case 'rect':
            addMeasureProps(RECT)
            break
          case 'size':
            addMeasureProps(SIZE)
            break
          case 'scrollOffset':
            fns.push(wrapFn(instance.scrollOffset || getScrollOffsetFallback))
            break
          case 'dataset':
            fns.push(getDataset(props))
            break
          case 'node':
          case 'context':
          case 'ref':
            fns.push(getInstanceConfig(key, instance))
            break
          default:
            plainProps[key] = value
            fns.push(getPlainProps(plainProps, props))
            break
        }
      }
    }

    const runCb = () => {
      return flushRefFns(fns).then((result) => {
        cb(result)
        return result
      })
    }

    return _createSelectorQuery(runCb)
  }

  const boundingClientRect = (cb = noop) => {
    const config = {
      id: true,
      dataset: true,
      rect: true,
      size: true
    }
    return fields(config, cb)
  }

  const context = (cb = noop) => {
    const config = {
      context: true
    }
    return fields(config, cb)
  }

  const node = (cb = noop) => {
    const config = {
      node: true
    }
    return fields(config, cb)
  }

  const ref = (cb = noop) => {
    const config = {
      ref: true
    }
    return fields(config, cb)
  }

  const scrollOffset = (cb = noop) => {
    const config = {
      id: true,
      dataset: true,
      scrollOffset: true
    }
    return fields(config, cb)
  }

  return {
    fields,
    boundingClientRect,
    context,
    node,
    ref,
    scrollOffset
  }
}
