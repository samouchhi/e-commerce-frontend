import { defineComponent, h, ref } from 'vue'
import { Button } from './button.js'
import { InputGroup, InputGroupInput, InputGroupAddon } from './input.js'
import { t } from '../../services/i18n.js'

export const PasswordInput = defineComponent({
  inheritAttrs: false,
  props: { modelValue: { default: '' }, disabled: Boolean, label: String },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    const visible = ref(false)
    return () => {
      const action = t(visible.value ? 'login.hidePassword' : 'login.showPassword')
      const actionLabel = props.label ? `${action} (${props.label})` : action
      return h(
        InputGroup,
        {},
        {
          default: () => [
            h(InputGroupInput, {
              ...attrs,
              modelValue: props.modelValue,
              type: visible.value ? 'text' : 'password',
              disabled: props.disabled,
              'onUpdate:modelValue': (value) => emit('update:modelValue', value),
            }),
            h(
              InputGroupAddon,
              { align: 'inline-end' },
              {
                default: () =>
                  h(
                    Button,
                    {
                      type: 'button',
                      variant: 'ghost',
                      size: 'icon',
                      disabled: props.disabled,
                      'aria-label': actionLabel,
                      'aria-pressed': visible.value,
                      'aria-controls': attrs.id,
                      title: actionLabel,
                      onClick: () => {
                        if (!props.disabled) visible.value = !visible.value
                      },
                    },
                    {
                      default: () =>
                        h(
                          'svg',
                          {
                            'data-icon': 'inline-start',
                            'aria-hidden': 'true',
                            viewBox: '0 0 24 24',
                            fill: 'none',
                            stroke: 'currentColor',
                            'stroke-width': 1.8,
                            'stroke-linecap': 'round',
                            'stroke-linejoin': 'round',
                          },
                          visible.value
                            ? [
                                h('path', {
                                  d: 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10 10 0 0 1 12 5c6 0 10 7 10 7a18 18 0 0 1-3 3.5M6.5 6.5A18 18 0 0 0 2 12s4 7 10 7a10 10 0 0 0 5.5-1.5',
                                }),
                              ]
                            : [
                                h('path', { d: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z' }),
                                h('circle', { cx: 12, cy: 12, r: 3 }),
                              ],
                        ),
                    },
                  ),
              },
            ),
          ],
        },
      )
    }
  },
})
