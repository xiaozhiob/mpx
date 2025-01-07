import React, { forwardRef, useRef, useContext, useState, useEffect } from 'react'
import { StyleSheet, Text, TouchableHighlight, View } from 'react-native'
import { warn } from '@mpxjs/utils'
import PickerSelector from './selector'
import PickerMultiSelector from './multiSelector'
import PickerTime from './time'
import PickerDate from './date'
import PickerRegion from './region'
import { FormContext, FormFieldValue } from '../context'
import useNodesRef, { HandlerRef } from '../useNodesRef'
import useInnerProps, { getCustomEvent } from '../getInnerListeners'
import { EventType, PickerMode, PickerProps, PickerValue, ValueType } from './type'
import { extendObject } from '../utils'
import { TouchableWithoutFeedback } from 'react-native-gesture-handler'
import { createPopupManager } from '../mpx-popup'

/**
 * ✔ mode
 * ✔ disabled
 * ✔ bindcancel
 * ✔ bindchange
 * ✔ range
 * ✔ range-key
 * ✔ value
 * ✔ start
 * ✔ end
 * ✔ fields 有效值 year,month,day，表示选择器的粒度
 * ✔ end
 * ✔ custom-item
 * ✔ level 选择器层级 province，city，region，<sub-district不支持>
 * ✔ level
 * ✔ header-text
 * ✘ bindcolumnchange
 */

const styles = StyleSheet.create({
  header: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eeeeee'
  },
  headerText: {
    color: '#333333',
    fontSize: 16,
    textAlign: 'center'
  },
  footer: {
    gap: 20,
    height: 50,
    marginBottom: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  footerItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    width: 110,
    borderRadius: 5
  },
  cancelButton: {
    backgroundColor: '#eeeeee'
  },
  confirmButton: {
    backgroundColor: '#1AAD19'
  },
  cancelText: {
    color: 'green',
    fontSize: 16,
    textAlign: 'center'
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center'
  }
})

const pickerModalMap: Record<PickerMode, React.ComponentType<PickerProps>> = {
  [PickerMode.SELECTOR]: PickerSelector,
  [PickerMode.MULTI_SELECTOR]: PickerMultiSelector,
  [PickerMode.TIME]: PickerTime,
  [PickerMode.DATE]: PickerDate,
  [PickerMode.REGION]: PickerRegion
}

const { open, remove } = createPopupManager()

const Picker = forwardRef<HandlerRef<View, PickerProps>, PickerProps>(
  (props: PickerProps, ref): React.JSX.Element => {
    const {
      mode,
      style,
      value,
      children,
      disabled,
      bindcancel,
      bindchange,
      'header-text': headerText = ''
    } = props

    const pickerValue = useRef(value)
    console.log('[mpx-picker], render ---> value=', value)
    pickerValue.current = value

    const innerLayout = useRef({})
    const nodeRef = useRef(null)
    useNodesRef<View, PickerProps>(props, ref, nodeRef, {
      style
    })
    const innerProps = useInnerProps(
      props,
      {
        ref: nodeRef
      },
      [],
      { layoutRef: innerLayout }
    )
    const getInnerLayout = (layout: React.MutableRefObject<{}>) => {
      innerLayout.current = layout.current
    }

    /** --- form 表单组件事件 --- */
    const getValue = () => {
      return pickerValue.current
    }
    const resetValue = () => {
      // TODO
      const defalutValue = 0
      pickerValue.current = defalutValue
    }
    const formContext = useContext(FormContext)
    let formValuesMap: Map<string, FormFieldValue> | undefined
    if (formContext) {
      formValuesMap = formContext.formValuesMap
    }
    if (formValuesMap) {
      if (!props.name) {
        warn('If a form component is used, the name attribute is required.')
      } else {
        formValuesMap.set(props.name, { getValue, resetValue })
      }
    }
    useEffect(() => {
      return () => {
        if (formValuesMap && props.name) {
          formValuesMap.delete(props.name)
        }
      }
    }, [])
    /** --- form 表单组件事件 --- */

    const onChange = (e: EventType) => {
      const { value } = e.detail
      console.log('[mpx-picker], onChange ---> value=', value)
      pickerValue.current = value
    }

    const columnChange = (value: PickerValue[], index: number) => {
      // type: "columnchange", detail: {column: 1, value: 2}
      const eventData = getCustomEvent(
        'columnchange',
        {},
        { detail: { column: index, value }, layoutRef: innerLayout }
      )
      // props.bindcolumnchange?.(eventData)
    }

    const onCancel = () => {
      bindcancel?.()
      remove()
    }

    const onConfirm = () => {
      const eventData = getCustomEvent(
        'change',
        {},
        { detail: { value: pickerValue.current }, layoutRef: innerLayout }
      )
      bindchange?.(eventData)
      remove()
    }

    const specificProps = extendObject(innerProps, {
      mode,
      children,
      bindchange: onChange,
      bindcolumnchange: columnChange,
      getInnerLayout
    })

    const renderPickerContent = () => {
      if (disabled) {
        return null
      }
      const _mode = mode ?? PickerMode.SELECTOR
      if (!(_mode in pickerModalMap)) {
        return warn(`[Mpx runtime warn]: Unsupported <picker> mode: ${mode}`)
      }
      const value: any = pickerValue.current
      const PickerModal = pickerModalMap[_mode]
      const renderPickerModal = (
        <>
          {headerText && (
            <View style={[styles.header]}>
              <Text style={[styles.headerText]}>{headerText}</Text>
            </View>
          )}
          <PickerModal {...specificProps} remove={remove} value={value}></PickerModal>
          <View style={[styles.footer]}>
            <TouchableHighlight
              onPress={onCancel}
              style={[styles.footerItem, styles.cancelButton]}
              activeOpacity={1}
              underlayColor={'#DDDDDD'}
            >
              <Text style={[styles.cancelText]}>取消</Text>
            </TouchableHighlight>
            <TouchableHighlight
              onPress={onConfirm}
              style={[styles.footerItem, styles.confirmButton]}
              activeOpacity={1}
              underlayColor={'#179B16'}
            >
              <Text style={[styles.confirmText]}>确定</Text>
            </TouchableHighlight>
          </View>
        </>
      )
      open(renderPickerModal)
    }

    return (
      <TouchableWithoutFeedback onPress={renderPickerContent}>
        {children}
      </TouchableWithoutFeedback>
    )
  }
)

Picker.displayName = 'MpxPicker'
export default Picker
