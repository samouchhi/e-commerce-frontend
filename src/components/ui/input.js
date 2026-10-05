// Native controls retain autocomplete and keyboard behavior; styling follows shadcn-vue.
import { defineComponent, h } from 'vue'
import { cn } from '../../lib/utils.js'
const controlClass =
  'scroll-mt-28 min-h-12 w-full min-w-0 rounded-xl border border-transparent bg-accent-soft px-4 py-3 text-base text-ink outline-none placeholder:text-muted/75 transition-[box-shadow,background-color] duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] focus:bg-paper focus:ring-2 focus:ring-ink/65 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:bg-danger-soft aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-danger-line'
const control = (tag, classes) =>
  defineComponent({
    inheritAttrs: false,
    props: { modelValue: { default: '' } },
    emits: ['update:modelValue'],
    setup:
      (props, { attrs, slots, emit }) =>
      () =>
        h(
          tag,
          {
            ...attrs,
            value: props.modelValue,
            class: cn(classes, attrs.class),
            onInput: (event) => {
              if (tag !== 'select') emit('update:modelValue', event.target.value)
              attrs.onInput?.(event)
            },
            onChange: (event) => {
              if (tag === 'select') emit('update:modelValue', event.target.value)
              attrs.onChange?.(event)
            },
          },
          slots.default?.(),
        ),
  })
export const Input = control('input', controlClass)
export const Textarea = control('textarea', `${controlClass} resize-y`)
export const NativeSelect = control('select', `${controlClass} cursor-pointer`)
export const InputGroupInput = control(
  'input',
  'scroll-mt-28 min-h-12 w-full min-w-0 border-0 bg-transparent px-3 py-3 text-base text-ink outline-none placeholder:text-muted/75 disabled:cursor-not-allowed',
)
export const InputGroup = defineComponent({
  inheritAttrs: false,
  setup:
    (_, { attrs, slots }) =>
    () =>
      h(
        'div',
        {
          ...attrs,
          class: cn(
            'flex min-w-0 items-center rounded-xl bg-accent-soft transition-shadow has-[:focus]:ring-2 has-[:focus]:ring-ink/65 has-[[aria-invalid=true]]:bg-danger-soft has-[[aria-invalid=true]]:ring-1 has-[[aria-invalid=true]]:ring-danger-line',
            attrs.class,
          ),
        },
        slots.default?.(),
      ),
})
export const InputGroupAddon = defineComponent({
  inheritAttrs: false,
  props: { align: { default: 'inline-start' } },
  setup:
    (props, { attrs, slots }) =>
    () =>
      h(
        'span',
        {
          ...attrs,
          class: cn(
            'shrink-0 text-base text-muted',
            props.align === 'inline-end' ? 'pr-2' : 'pl-4',
            attrs.class,
          ),
        },
        slots.default?.(),
      ),
})
