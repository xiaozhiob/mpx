import { setByPath, error, parseDataset } from '@mpxjs/utils'
import Mpx from '../../index'

export default function proxyEventMixin () {
  return {
    beforeCreate () {
      const modelEvent = this.$attrs.mpxModelEvent
      if (modelEvent) {
        this.$on(modelEvent, (e) => {
          this.$emit('mpxModel', e)
        })
      }
    },
    methods: {
      __model (expr, $event, valuePath = ['value'], filterMethod) {
        const innerFilter = {
          trim: (val) => typeof val === 'string' && val.trim()
        }
        const originValue = valuePath.reduce(
          (acc, cur) => acc[cur],
          $event.detail
        )
        const value = filterMethod
          ? innerFilter[filterMethod]
            ? innerFilter[filterMethod](originValue)
            : typeof this[filterMethod] === 'function' && this[filterMethod]
          : originValue
        setByPath(this, expr, value)
      },
      __invokeHandler (rawEvent, eventConfig = []) {
        if (typeof Mpx.config.proxyEventHandler === 'function') {
          try {
            Mpx.config.proxyEventHandler(rawEvent)
          } catch (e) {}
        }
        const location = this.__mpxProxy.options.mpxFileResource

        const newEvent = Object.create(Object.getPrototypeOf(rawEvent), Object.getOwnPropertyDescriptors(rawEvent))

        const originalTarget = rawEvent.target
        const originalCurrentTarget = rawEvent.currentTarget

        Object.defineProperties(newEvent, {
          target: {
            get () {
              if (!originalTarget) return originalTarget
              if (!this._target) {
                this._target = Object.create(originalTarget, {
                  dataset: {
                    get () {
                      return parseDataset(originalTarget.dataset)
                    }
                  }
                })
              }
              return this._target
            },
            configurable: true,
            enumerable: true
          },
          currentTarget: {
            get () {
              if (!originalCurrentTarget) return originalCurrentTarget
              if (!this._currentTarget) {
                this._currentTarget = Object.create(originalCurrentTarget, {
                  dataset: {
                    get () {
                      return parseDataset(originalCurrentTarget.dataset)
                    }
                  }
                })
              }
              return this._currentTarget
            },
            configurable: true,
            enumerable: true
          }
        })
        let returnedValue
        eventConfig.forEach((item) => {
          const callbackName = item[0]
          if (callbackName) {
            const params =
              item.length > 1
                ? item.slice(1).map((item) => {
                    if (item === '__mpx_event__') {
                      return newEvent
                    } else {
                      return item
                    }
                  })
                : [newEvent]
            if (typeof this[callbackName] === 'function') {
              returnedValue = this[callbackName].apply(this, params)
            } else {
              error(
                `Instance property [${callbackName}] is not function, please check.`,
                location
              )
            }
          }
        })
        return returnedValue
      }
    }
  }
}
