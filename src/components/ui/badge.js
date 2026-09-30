// shadcn-vue Badge, adapted to JavaScript with a semantic success variant.
import { defineComponent, h } from 'vue'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils.js'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-accent text-white',
        success: 'border-success-line bg-success-soft text-success',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export const Badge = defineComponent({
  inheritAttrs: false,
  props: { variant: String },
  setup:
    (props, { attrs, slots }) =>
    () =>
      h(
        'span',
        {
          ...attrs,
          class: cn(badgeVariants({ variant: props.variant }), attrs.class),
        },
        slots.default?.(),
      ),
})
