const { hump2dash } = require('../../../utils/hump-dash')

module.exports = function getSpec ({ warn, error }) {
  // React Native 双端都不支持的 CSS property
  const unsupportedPropExp = /^(box-sizing|white-space|text-overflow|animation|transition|font-variant-caps|font-variant-numeric|font-variant-east-asian|font-variant-alternates|font-variant-ligatures|background-position)$/
  const unsupportedPropMode = {
    // React Native ios 不支持的 CSS property
    ios: /^(vertical-align)$/,
    // React Native android 不支持的 CSS property
    android: /^(text-decoration-style|text-decoration-color|shadow-offset|shadow-opacity|shadow-radius)$/
  }
  // 不支持的属性提示
  const unsupportedPropError = ({ prop, mode }) => {
    error(`Property [${prop}] is not supported in React Native ${mode} environment!`)
  }
  // prop 校验
  const verifyProps = ({ prop, value }, { mode }, isError = true) => {
    const tips = isError ? error : warn
    if (unsupportedPropExp.test(prop) || unsupportedPropMode[mode].test(prop)) {
      tips(`Property [${prop}] is not supported in React Native ${mode} environment!`)
      return false
    }
    return true
  }
  // 值类型
  const ValueType = {
    number: 'number',
    color: 'color',
    enum: 'enum'
  }
  // React 属性支持的枚举值
  const SUPPORTED_PROP_VAL_ARR = {
    'backface-visibility': ['visible', 'hidden'],
    overflow: ['visible', 'hidden', 'scroll'],
    'border-style': ['solid', 'dotted', 'dashed'],
    'object-fit': ['cover', 'contain', 'fill', 'scale-down'],
    direction: ['inherit', 'ltr', 'rtl'],
    display: ['flex', 'none'],
    'flex-direction': ['row', 'row-reverse', 'column', 'column-reverse'],
    'flex-wrap': ['wrap', 'nowrap', 'wrap-reverse'],
    'pointer-events': ['auto', 'box-none', 'box-only', 'none'],
    'vertical-align': ['auto', 'top', 'bottom', 'center'],
    position: ['relative', 'absolute'],
    'font-variant': ['small-caps', 'oldstyle-nums', 'lining-nums', 'tabular-nums', 'proportional-nums'],
    'text-align': ['left', 'right', 'center', 'justify'],
    'font-style': ['normal', 'italic'],
    'font-weight': ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
    'text-decoration-line': ['none', 'underline', 'line-through', 'underline line-through'],
    'text-decoration-style': ['solid', 'double', 'dotted', 'dashed'],
    'text-transform': ['none', 'uppercase', 'lowercase', 'capitalize'],
    'user-select': ['auto', 'text', 'none', 'contain', 'all'],
    'align-content': ['flex-start', 'flex-end', 'center', 'stretch', 'space-between', 'space-around', 'space-evenly'],
    'align-items': ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'],
    'align-self': ['auto', 'flex-start', 'flex-end', 'center', 'stretch', 'baseline'],
    'justify-content': ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
    'background-size': ['contain', 'cover', 'auto', ValueType.number],
    'background-repeat': ['no-repeat'],
    width: ['auto', ValueType.number],
    height: ['auto', ValueType.number],
    'flex-basis': ['auto', ValueType.number],
    margin: ['auto', ValueType.number],
    'margin-top': ['auto', ValueType.number],
    'margin-left': ['auto', ValueType.number],
    'margin-bottom': ['auto', ValueType.number],
    'margin-right': ['auto', ValueType.number],
    'margin-horizontal': ['auto', ValueType.number],
    'margin-vertical': ['auto', ValueType.number]
  }
  // 获取值类型
  const getValueType = (prop) => {
    // 值类型
    const propExp = {
      // 重要！！优先判断是不是枚举类型
      enum: new RegExp('^(' + Object.keys(SUPPORTED_PROP_VAL_ARR).join('|') + ')$'),
      number: /^((flex-grow|opacity|flex|flex-shrink|gap|left|right|top|bottom)|(.+-(width|height|left|right|top|bottom|radius|spacing|size|gap|index|offset|opacity)))$/,
      color: /^(color|(.+-color))$/
    }
    return Object.keys(propExp).find(k => propExp[k].test(prop))
  }
  // 属性值校验
  const verifyValues = ({ prop, value }, isError = true) => {
    const type = getValueType(prop)
    const valueExp = {
      number: /^\s*(-?\d+(\.\d+)?)(rpx|px|%)?\s*$/,
      color: /(^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$)|^(rgb\(|rgba\(|hsl\(|hsla\(|hwb\()/
    }
    const tips = isError ? error : warn
    switch (type) {
      case ValueType.number: {
        if (!valueExp.number.test(value)) {
          tips(`The value type of [${prop}] only supports [Number] in React Native environment, eg 10rpx, 10px, 10%, 10, please check again`)
          return false
        }
        return true
      }
      case ValueType.color: {
        if (!valueExp.color.test(value)) {
          tips(`The value type of [${prop}] only supports [Color] in React Native environment, eg #000, rgba(0,0,0,0), please check again`)
          return false
        }
        return true
      }
      case ValueType.enum: {
        const isIn = SUPPORTED_PROP_VAL_ARR[prop].includes(value)
        const isType = Object.keys(valueExp).some(item => valueExp[item].test(value) && SUPPORTED_PROP_VAL_ARR[prop].includes(ValueType[item]))
        if (!isIn && !isType) {
          tips(`Property [${prop}] only support value [${SUPPORTED_PROP_VAL_ARR[prop]?.join(',')}] in React Native environment, the value [${value}] does not support!`)
          return false
        }
        return true
      }
    }
    return true
  }
  // prop & value 校验：过滤的不合法的属性和属性值
  const verification = ({ prop, value }, { mode }) => {
    return verifyProps({ prop, value }, { mode }) && verifyValues({ prop, value }) && ({ prop, value })
  }

  // 简写转换规则
  const AbbreviationMap = {
    // 仅支持 offset-x | offset-y | blur-radius | color 排序
    'text-shadow': ['textShadowOffset.width', 'textShadowOffset.height', 'textShadowRadius', 'textShadowColor'],
    // 仅支持 width | style | color 这种排序
    border: ['borderWidth', 'borderStyle', 'borderColor'],
    // 仅支持 width | style | color 这种排序
    'border-left': ['borderLeftWidth', 'borderLeftStyle', 'borderLeftColor'],
    // 仅支持 width | style | color 这种排序
    'border-right': ['borderRightWidth', 'borderRightStyle', 'borderRightColor'],
    // 仅支持 width | style | color 这种排序
    'border-top': ['borderTopWidth', 'borderTopStyle', 'borderTopColor'],
    // 仅支持 width | style | color 这种排序
    'border-bottom': ['borderBottomWidth', 'borderBottomStyle', 'borderBottomColor'],
    // 仅支持 offset-x | offset-y | blur-radius | color 排序
    'box-shadow': ['shadowOffset.width', 'shadowOffset.height', 'shadowRadius', 'shadowColor'],
    // 仅支持 text-decoration-line text-decoration-style text-decoration-color 这种格式
    'text-decoration': ['textDecorationLine', 'textDecorationStyle', 'textDecorationColor'],
    // flex-grow | flex-shrink | flex-basis
    flex: ['flexGrow', 'flexShrink', 'flexBasis'],
    // flex-flow: <'flex-direction'> or flex-flow: <'flex-direction'> and <'flex-wrap'>
    'flex-flow': ['flexDirection', 'flexWrap'],
    'border-radius': ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']
  }
  const formatAbbreviation = ({ prop, value }, { mode }) => {
    const props = AbbreviationMap[prop]
    const values = value.trim().split(/\s(?![^()]*\))/)
    const cssMap = []
    let idx = 0
    let propsIdx = 0
    const diff = values.length - props.length
    while (idx < values.length) {
      const prop = props[propsIdx]
      const value = values[idx]
      const newProp = hump2dash(prop.replace(/\..+/, ''))
      if (!verifyProps({ prop: newProp, value }, { mode })) {
        // 有 ios or android 不支持的 prop，跳过 prop
        if (diff === 0) {
          propsIdx++
          idx++
        } else {
          propsIdx++
        }
      } else if (!verifyValues({ prop: newProp, value }, diff === 0)) {
        // 值不合法 跳过 value
        if (diff === 0) {
          propsIdx++
          idx++
        } else if (diff < 0) {
          propsIdx++
        } else {
          idx++
        }
      } else if (prop.includes('.')) {
        // 多个属性值的prop
        const [main, sub] = prop.split('.')
        const cssData = cssMap.find(item => item.prop === main)
        if (cssData) { // 设置过
          cssData.value[sub] = value
        } else { // 第一次设置
          cssMap.push({
            prop: main,
            value: {
              [sub]: value
            }
          })
        }
        idx += 1
        propsIdx += 1
      } else {
        // 单个值的属性
        cssMap.push({
          prop,
          value
        })
        idx += 1
        propsIdx += 1
      }
    }
    return cssMap
  }

  // margin padding
  const formatMargins = ({ prop, value }) => {
    const values = value.trim().split(/\s(?![^()]*\))/)
    // format
    let suffix = []
    switch (values.length) {
      // case 1:
      case 2:
        suffix = ['Vertical', 'Horizontal']
        break
      case 3:
        suffix = ['Top', 'Horizontal', 'Bottom']
        break
      case 4:
        suffix = ['Top', 'Right', 'Bottom', 'Left']
        break
    }
    return values.map((value, index) => {
      const newProp = `${prop}${suffix[index] || ''}`
      // validate
      verifyValues({ prop: hump2dash(newProp), value }, false)
      return {
        prop: newProp,
        value: value
      }
    })
  }

  // line-height
  const formatLineHeight = ({ prop, value }) => {
    return verifyValues({ prop, value }) && ({
      prop,
      value: /^\s*-?\d+(\.\d+)?\s*$/.test(value) ? `${Math.round(value * 100)}%` : value
    })
  }

  // // font-variant 转换
  // const getFontVariant = ({ prop, value }) => {
  //   if (/^()$/.test(prop)) {
  //     error(`Property [${prop}] is not supported in React Native environment, please replace [font-variant]!`)
  //   }
  //   prop = 'font-variant'
  //   // 校验枚举值
  //
  //   return verifyValues({ prop, value }) && ({ prop, value })
  // }

  // background 相关属性的转换 Todo
  // 仅支持以下属性，不支持其他背景相关的属性
  // /^((?!(-color)).)*background((?!(-color)).)*$/ 包含background且不包含background-color
  const checkBackgroundImage = ({ prop, value }, { mode }) => {
    const bgPropMap = {
      image: 'background-image',
      color: 'background-color',
      size: 'background-size',
      repeat: 'background-repeat',
      // position: 'background-position',
      all: 'background'
    }
    const urlExp = /url\(["']?(.*?)["']?\)/
    switch (prop) {
      case bgPropMap.image: {
        // background-image 仅支持背景图
        const imgUrl = value.match(urlExp)?.[0]
        if (/.*linear-gradient*./.test(value)) {
          error(`<linear-gradient()> is not supported in React Native ${mode} environment!`)
        }
        if (imgUrl) {
          return { prop, value: imgUrl }
        } else {
          error(`[${prop}] only support value <url()>`)
          return false
        }
      }
      case bgPropMap.size: {
        // background-size
        // 不支持逗号分隔的多个值：设置多重背景!!!
        // 支持一个值:这个值指定图片的宽度，图片的高度隐式的为 auto
        // 支持两个值:第一个值指定图片的宽度，第二个值指定图片的高度
        if (value.includes(',')) { // commas are not allowed in values
          error(`background size value[${value}] does not support commas in React Native ${mode} environment!`)
          return false
        }
        const values = []
        value.trim().split(/\s(?![^()]*\))/).forEach(item => {
          if (verifyValues({ prop, value: item })) {
            // 支持 number 值 / container cover auto 枚举
            values.push(item)
          }
        })
        // value 无有效值时返回false
        return values.length === 0 ? false : { prop, value: values }
      }
      case bgPropMap.all: {
        // background: 仅支持 background-image & background-color & background-repeat
        const bgMap = []
        const values = value.trim().split(/\s(?![^()]*\))/)
        values.forEach(item => {
          const url = item.match(urlExp)?.[0]
          if (/.*linear-gradient*./.test(item)) {
            error(`<linear-gradient()> is not supported in React Native ${mode} environment!`)
          } else if (url) {
            bgMap.push({ prop: bgPropMap.image, value: url })
          } else if (verifyValues({ prop: bgPropMap.color, value: item }, false)) {
            bgMap.push({ prop: bgPropMap.color, value: item })
          } else if (verifyValues({ prop: bgPropMap.repeat, value: item }, false)) {
            bgMap.push({ prop: bgPropMap.repeat, value: item })
          }
        })
        return bgMap.length ? bgMap : false
      }
    }
    unsupportedPropError({ prop, mode })
    return false
  }

  // border-radius 缩写转换
  const getBorderRadius = ({ prop, value }, { mode }) => {
    const values = value.trim().split(/\s(?![^()]*\))/)
    if (values.length === 1) {
      verifyValues({ prop, value }, false)
      return { prop, value }
    } else {
      if (values.length === 2) {
        values.push(...values)
      } else if (values.length === 3) {
        values.push(values[1])
      }
      return formatAbbreviation({ prop, value: values.join(' ') }, { mode })
    }
  }

  // transform 转换
  const formatTransform = ({ prop, value }, { mode }) => {
    if (Array.isArray(value)) return { prop, value }
    const values = value.trim().split(/\s(?![^()]*\))/)
    const transform = []
    values.forEach(item => {
      const match = item.match(/([/\w]+)\(([^)]+)\)/)
      if (match.length >= 3) {
        let key = match[1]
        const val = match[2]
        switch (key) {
          case 'translateX':
          case 'translateY':
          case 'scaleX':
          case 'scaleY':
          case 'rotateX':
          case 'rotateY':
          case 'rotateZ':
          case 'rotate':
          case 'skewX':
          case 'skewY':
          case 'perspective':
            // 单个值处理
            transform.push({ [key]: val })
            break
          case 'matrix':
          case 'matrix3d':
            transform.push({ [key]: val.split(',').map(val => +val) })
            break
          case 'translate':
          case 'scale':
          case 'skew':
          case 'rotate3d': // x y z angle
          case 'translate3d': // x y 支持 z不支持
          case 'scale3d': // x y 支持 z不支持
          {
            // 2 个以上的值处理
            key = key.replace('3d', '')
            const vals = val.split(',').splice(0, key === 'rotate' ? 4 : 3)
            const xyz = ['X', 'Y', 'Z']
            transform.push(...vals.map((v, index) => {
              if (key !== 'rotate' && index > 1) {
                unsupportedPropError({ prop: `${key}Z`, mode })
              }
              return { [`${key}${xyz[index] || ''}`]: v.trim() }
            }))
            break
          }
          case 'translateZ':
          case 'scaleZ':
          default:
            // 不支持的属性处理
            unsupportedPropError({ prop: key, mode })
            break
        }
      } else {
        error(`Property [${prop}] is invalid, please check the value!`)
      }
    })
    return {
      prop,
      value: transform
    }
  }

  const spec = {
    supportedModes: ['ios', 'android'],
    rules: [
      { // 背景相关属性的处理
        test: /^(background|background-image|background-size)$/,
        ios: checkBackgroundImage,
        android: checkBackgroundImage
      },
      // {
      //   test: 'box-shadow',
      //   ios: getAbbreviation,
      //   android: getAbbreviationAndroid
      // },
      // {
      //   test: 'text-decoration',
      //   ios: getAbbreviation,
      //   android: getAbbreviationAndroid
      // },
      // {
      //   test: /^(font-variant|font-variant-caps|font-variant-numeric|font-variant-east-asian|font-variant-alternates|font-variant-ligatures)$/,
      //   ios: getFontVariant,
      //   android: getFontVariant
      // },
      {
        test: 'border-radius',
        ios: getBorderRadius,
        android: getBorderRadius
      },
      { // margin padding 内外边距的处理
        test: /^(margin|padding)$/,
        ios: formatMargins,
        android: formatMargins
      },
      { // line-height 换算
        test: 'line-height',
        ios: formatLineHeight,
        android: formatLineHeight
      },
      {
        test: 'transform',
        ios: formatTransform,
        android: formatTransform
      },
      // 通用的简写格式匹配
      {
        test: new RegExp('^(' + Object.keys(AbbreviationMap).join('|') + ')$'),
        ios: formatAbbreviation,
        android: formatAbbreviation
      },
      // 属性&属性值校验
      {
        test: () => true,
        ios: verification,
        android: verification
      }
    ]
  }
  return spec
}
