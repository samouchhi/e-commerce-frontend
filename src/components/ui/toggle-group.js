// shadcn-vue option controls using the storefront's existing Reka primitives.
import { defineComponent, h } from 'vue'
import { ToggleGroupRoot, ToggleGroupItem as Item } from 'reka-ui'
import { cn } from '../../lib/utils.js'

export const ToggleGroup = defineComponent({
  inheritAttrs: false,
  props: { modelValue: String, disabled: Boolean },
  emits: ['update:modelValue'],
  setup:
    (props, { attrs, slots, emit }) =>
    () =>
      h(
        ToggleGroupRoot,
        {
          ...attrs,
          ...props,
          type: 'single',
          class: cn('flex flex-wrap gap-2', attrs.class),
          'onUpdate:modelValue': (value) => emit('update:modelValue', value),
        },
        slots,
      ),
})

export const ToggleGroupItem = defineComponent({
  inheritAttrs: false,
  props: { value: { type: String, required: true }, disabled: Boolean },
  setup:
    (props, { attrs, slots }) =>
    () =>
      h(
        Item,
        {
          ...attrs,
          ...props,
          class: cn(
            'inline-flex min-h-11 min-w-12 max-w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-soft data-[state=on]:border-ink data-[state=on]:bg-ink data-[state=on]:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through [&_svg]:size-4',
            attrs.class,
          ),
        },
        slots,
      ),
})
