// shadcn-vue RadioGroup, adapted to JavaScript and the storefront tokens.
import { defineComponent, h } from 'vue'
import { RadioGroupRoot, RadioGroupItem as Item, RadioGroupIndicator } from 'reka-ui'
import { cn } from '../../lib/utils.js'

export const RadioGroup = defineComponent({
  inheritAttrs: false,
  props: { modelValue: String, disabled: Boolean },
  emits: ['update:modelValue'],
  setup:
    (props, { attrs, slots, emit }) =>
    () =>
      h(
        RadioGroupRoot,
        {
          ...attrs,
          ...props,
          class: cn('grid gap-2', attrs.class),
          'onUpdate:modelValue': (value) => emit('update:modelValue', value),
        },
        slots,
      ),
})

export const RadioGroupItem = defineComponent({
  inheritAttrs: false,
  props: { value: { type: String, required: true }, disabled: Boolean },
  setup:
    (props, { attrs }) =>
    () =>
      h(
        Item,
        {
          ...attrs,
          ...props,
          class: cn(
            'size-4 shrink-0 rounded-full border border-ink text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50',
            attrs.class,
          ),
        },
        {
          default: () =>
            h(
              RadioGroupIndicator,
              { class: 'flex items-center justify-center' },
              {
                default: () => h('span', { class: 'size-2 rounded-full bg-accent' }),
              },
            ),
        },
      ),
})
