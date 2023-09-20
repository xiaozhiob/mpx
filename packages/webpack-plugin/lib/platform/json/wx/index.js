const runRules = require('../../run-rules')
const normalizeTest = require('../normalize-test')
const changeKey = require('../change-key')
const normalize = require('../../../utils/normalize')
const { capitalToHyphen } = require('../../../utils/string')
const type = require('../../../utils/type')
const hasOwn = require('../../../utils/has-own')

const mpxViewPath = normalize.lib('runtime/components/ali/mpx-view.mpx')
const mpxTextPath = normalize.lib('runtime/components/ali/mpx-text.mpx')

module.exports = function getSpec ({ warn, error }) {
  function print (mode, path, isError) {
    const msg = `Json path <${path}> is not supported in ${mode} environment!`
    isError ? error(msg) : warn(msg)
  }

  function deletePath (opts) {
    let isError = opts
    let shouldLog = true
    if (typeof opts === 'object') {
      shouldLog = !opts.noLog
      isError = opts.isError
    }

    return function (input, { mode, pathArr = [] }, meta) {
      const currPath = meta.paths.join('|')
      if (shouldLog) {
        print(mode, pathArr.concat(currPath).join('.'), isError)
      }
      meta.paths.forEach((path) => {
        delete input[path]
      })
      return input
    }
  }

  function checkAliComponentGenericsValue (input, { mode }) {
    const componentGenerics = input.componentGenerics
    for (const tag in componentGenerics) {
      const value = componentGenerics[tag]
      if (type(value) === 'Boolean' || (type(value) === 'Object' && !hasOwn(value, 'default'))) {
        warn(`在 ${mode} 环境当中 componentGenerics ${tag} 必须配置默认自定义组件`)
        break
      }
    }
    return input
  }

  /**
   * @desc 在app.mpx里配置usingComponents作为全局组件
   */

  function addGlobalComponents (input, { globalComponents }) {
    if (globalComponents) {
      input.usingComponents = Object.assign({}, globalComponents, input.usingComponents)
    }
    return input
  }

  // 处理支付宝 componentPlaceholder 不支持 view、text 原生标签
  function aliComponentPlaceholderFallback (input) {
    // 处理 驼峰转连字符
    input = componentNameCapitalToHyphen('componentPlaceholder')(input)
    const componentPlaceholder = input.componentPlaceholder
    const usingComponents = input.usingComponents || (input.usingComponents = {})
    for (const cph in componentPlaceholder) {
      const cur = componentPlaceholder[cph]
      const placeholderCompMatched = cur.match(/^(?:view|text)$/g)
      if (!Array.isArray(placeholderCompMatched)) continue
      let compName, compPath
      switch (placeholderCompMatched[0]) {
        case 'view':
          compName = 'mpx-view'
          compPath = mpxViewPath
          break
        case 'text':
          compName = 'mpx-text'
          compPath = mpxTextPath
      }
      usingComponents[compName] = compPath
      componentPlaceholder[cph] = compName
    }
    return input
  }

  function fillGlobalComponents (input, { globalComponents }) {
    if (globalComponents) {
      Object.assign(globalComponents, input.usingComponents)
    }
    return input
  }

  // 处理 ali swan 的组件名大写字母转连字符：WordExample/wordExample -> word-example
  function componentNameCapitalToHyphen (type) {
    return function (input) {
      // 百度和支付宝不支持大写组件标签名，统一转成带“-”和小写的形式。百度自带标签不会有带大写的情况
      // 后续可能需要考虑这些平台支持 componentGenerics 后的转换 https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/generics.html
      const obj = input[type]
      if (obj) {
        Object.entries(obj).forEach(([k, v]) => {
          const keyNeed = /[A-Z]/g.test(k)
          const valueNeed = /[A-Z]/g.test(v)

          let newK
          let newV

          if (keyNeed) {
            newK = capitalToHyphen(k)
            if (obj[newK]) {
              warn && warn(`Component name "${newK}" already exists, so component "${k}" can't be converted automatically and it isn't supported in ali/swan environment!`)
            } else {
              obj[newK] = v
              delete obj[k]
            }
          }

          // componentPlaceholder 的 value 也需要转换
          if (type === 'componentPlaceholder' && valueNeed) {
            newV = capitalToHyphen(v)
            obj[newK || k] = newV
          }
        })
      }
      return input
    }
  }

  const componentRules = [
    {
      test: 'componentGenerics',
      ali: checkAliComponentGenericsValue
    },
    {
      test: 'componentPlaceholder',
      ali: aliComponentPlaceholderFallback,
      swan: deletePath(),
      tt: deletePath(),
      jd: deletePath()
    },
    {
      test: 'usingComponents',
      ali: componentNameCapitalToHyphen('usingComponents'),
      swan: componentNameCapitalToHyphen('usingComponents')
    },
    {
      // todo ali 2.0已支持全局组件，待移除
      ali: addGlobalComponents,
      swan: addGlobalComponents,
      qq: addGlobalComponents,
      tt: addGlobalComponents,
      jd: addGlobalComponents
    }
  ]

  const windowRules = [
    {
      test: 'navigationBarTitleText',
      ali (input) {
        return changeKey(input, this.test, 'defaultTitle')
      }
    },
    {
      test: 'enablePullDownRefresh',
      ali (input) {
        input = changeKey(input, this.test, 'pullRefresh')
        if (input.pullRefresh) {
          input.allowsBounceVertical = 'YES'
        }
        return input
      },
      jd: deletePath()
    },
    {
      test: 'navigationBarBackgroundColor',
      ali (input) {
        return changeKey(input, this.test, 'titleBarColor')
      }
    },
    {
      test: 'disableSwipeBack',
      ali: deletePath(),
      qq: deletePath(),
      jd: deletePath(),
      swan: deletePath()
    },
    {
      test: 'onReachBottomDistance',
      qq: deletePath(),
      jd: deletePath()
    },
    {
      test: 'disableScroll',
      ali: deletePath(),
      qq: deletePath(),
      jd: deletePath()
    },
    {
      test: 'backgroundColorTop|backgroundColorBottom',
      ali: deletePath(),
      swan: deletePath()
    },
    {
      test: 'navigationBarTextStyle|navigationStyle|backgroundTextStyle',
      ali: deletePath()
    },
    {
      test: 'pageOrientation',
      ali: deletePath(),
      swan: deletePath(),
      tt: deletePath(),
      jd: deletePath()
    }
  ]

  const getTabBarRule = () => (input, { mode }) => {
    input.tabBar = runRules(spec.tabBar, input.tabBar, {
      mode,
      normalizeTest,
      waterfall: true,
      data: {
        pathArr: ['tabBar']
      }
    })
    return input
  }

  const getWindowRule = () => (input, { mode }) => {
    input.window = runRules(spec.window, input.window, {
      mode,
      normalizeTest,
      waterfall: true,
      data: {
        pathArr: ['window']
      }
    })
    return input
  }

  const spec = {
    supportedModes: ['ali', 'swan', 'qq', 'tt', 'jd', 'qa', 'dd'],
    normalizeTest,
    page: [
      ...windowRules,
      ...componentRules
    ],
    component: componentRules,
    window: windowRules,
    tabBar: {
      list: [
        {
          test: 'text',
          ali (input) {
            return changeKey(input, this.test, 'name')
          }
        },
        {
          test: 'iconPath',
          ali (input) {
            return changeKey(input, this.test, 'icon')
          }
        },
        {
          test: 'selectedIconPath',
          ali (input) {
            return changeKey(input, this.test, 'activeIcon')
          }
        }
      ],
      rules: [
        {
          test: 'color',
          ali (input) {
            return changeKey(input, this.test, 'textColor')
          }
        },
        {
          test: 'list',
          ali (input) {
            const value = input.list
            delete input.list
            input.items = value.map(item => {
              return runRules(spec.tabBar.list, item, {
                mode: 'ali',
                normalizeTest,
                waterfall: true,
                data: {
                  pathArr: ['tabBar', 'list']
                }
              })
            })
            return input
          }
        },
        {
          test: 'position',
          ali: deletePath(),
          swan: deletePath()
        },
        {
          test: 'borderStyle',
          ali: deletePath()
        },
        {
          test: 'custom',
          swan: deletePath(),
          tt: deletePath(),
          jd: deletePath()
        }
      ]
    },
    rules: [
      {
        test: 'resizable',
        ali: deletePath(),
        qq: deletePath(),
        swan: deletePath(),
        tt: deletePath(),
        jd: deletePath()
      },
      {
        test: 'preloadRule',
        tt: deletePath(),
        jd: deletePath()
      },
      {
        test: 'functionalPages',
        ali: deletePath(true),
        qq: deletePath(true),
        swan: deletePath(true),
        tt: deletePath(),
        jd: deletePath(true)
      },
      {
        test: 'plugins',
        qq: deletePath(true),
        swan: deletePath(true),
        tt: deletePath(),
        jd: deletePath(true)
      },
      {
        test: 'usingComponents',
        ali: componentNameCapitalToHyphen('usingComponents'),
        swan: componentNameCapitalToHyphen('usingComponents')
      },
      {
        test: 'usingComponents',
        // todo ali 2.0已支持全局组件，待移除
        ali: fillGlobalComponents,
        qq: fillGlobalComponents,
        swan: fillGlobalComponents,
        tt: fillGlobalComponents,
        jd: fillGlobalComponents
      },
      {
        test: 'usingComponents',
        // todo ali 2.0已支持全局组件，待移除
        ali: deletePath({ noLog: true }),
        qq: deletePath({ noLog: true }),
        swan: deletePath({ noLog: true }),
        tt: deletePath({ noLog: true }),
        jd: deletePath({ noLog: true })
      },
      {
        test: 'debug',
        ali: deletePath(),
        swan: deletePath()
      },
      {
        test: 'requiredBackgroundModes',
        ali: deletePath(),
        tt: deletePath()
      },
      {
        test: 'workers',
        jd: deletePath(),
        ali: deletePath(),
        swan: deletePath(),
        tt: deletePath()
      },
      {
        test: 'subpackages|subPackages',
        jd: deletePath(true)
      },
      {
        test: 'packages',
        jd: deletePath()
      },
      {
        test: 'navigateToMiniProgramAppIdList|networkTimeout',
        ali: deletePath(),
        jd: deletePath()
      },
      {
        test: 'tabBar',
        ali: getTabBarRule(),
        qq: getTabBarRule(),
        swan: getTabBarRule(),
        tt: getTabBarRule(),
        jd: getTabBarRule()
      },
      {
        test: 'window',
        ali: getWindowRule(),
        qq: getWindowRule(),
        swan: getWindowRule(),
        tt: getWindowRule(),
        jd: getWindowRule()
      }
    ]
  }
  return spec
}
