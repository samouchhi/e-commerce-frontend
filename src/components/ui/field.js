// shadcn-vue Field composition, adapted to the storefront's semantic tokens.
import { defineComponent, h } from 'vue'
import { cn } from '../../lib/utils.js'
const primitive = (tag, classes, defaults = {}) =>
  defineComponent({
    inheritAttrs: false,
    setup:
      (_, { attrs, slots }) =>
      () =>
        h(tag, { ...defaults, ...attrs, class: cn(classes, attrs.class) }, slots.default?.()),
  })
export const FieldSet = primitive('fieldset', 'm-0 min-w-0 border-0 p-0')
export const FieldLegend = primitive('legend', 'mb-5 text-lg font-semibold text-ink')
export const FieldGroup = primitive('div', 'grid min-w-0 gap-5')
export const Field = primitive(
  'div',
  'grid min-w-0 content-start gap-2 data-[disabled=true]:opacity-60',
)
export const FieldLabel = primitive('label', 'text-sm font-semibold text-ink')
export const FieldError = primitive('p', 'm-0 text-sm leading-relaxed text-danger', {
  role: 'alert',
})
export const Separator = primitive('div', 'h-px w-full shrink-0 bg-ink/8', {
  role: 'separator',
  'aria-orientation': 'horizontal',
})
