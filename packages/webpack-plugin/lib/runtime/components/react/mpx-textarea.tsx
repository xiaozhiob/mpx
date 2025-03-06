/**
 * Compared with Input:
 *   Subtraction:
 *     type, password, confirm-hold
 *   Addition:
 *     - confirm-type: Not support `return`
 *     ✔ auto-height
 *     ✘ fixed
 *     ✘ show-confirm-bar
 *     ✔ bindlinechange: No `heightRpx` info.
 */
import { JSX, forwardRef, createElement } from 'react'
import { Keyboard, TextInput } from 'react-native'
import Input, { InputProps, PrivateInputProps } from './mpx-input'
import { omit, extendObject } from './utils'
import { HandlerRef } from './useNodesRef'

export type TextareProps = Omit<
  InputProps & PrivateInputProps,
  'type' | 'password' | 'multiline' | 'confirm-hold'
>

const DEFAULT_TEXTAREA_WIDTH = 300
const DEFAULT_TEXTAREA_HEIGHT = 150

const Textarea = forwardRef<HandlerRef<TextInput, TextareProps>, TextareProps>(
  (props, ref): JSX.Element => {
    const {
      style = {},
      'auto-height': autoHeight = false,
      'confirm-type': confirmType = 'text'
    } = props

    const restProps = omit(props, [
      'ref',
      'type',
      'style',
      'password',
      'multiline',
      'auto-height',
      'confirm-type',
      'confirm-hold'
    ])

    return createElement(
      Input,
      extendObject(restProps, {
        ref,
        autoHeight,
        confirmType,
        multiline: true,
        style: extendObject({
          width: DEFAULT_TEXTAREA_WIDTH,
          height: autoHeight ? 'auto' : DEFAULT_TEXTAREA_HEIGHT
        }, style)
      })
    )
  }
)

Textarea.displayName = 'MpxTextarea'

export default Textarea
