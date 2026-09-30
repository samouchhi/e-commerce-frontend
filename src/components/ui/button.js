// shadcn-vue Button, adapted to JavaScript and the storefront's existing tokens.
import { defineComponent, h } from 'vue'
import { Primitive } from 'reka-ui'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils.js'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-accent text-white hover:bg-accent-hover',
        outline: 'border border-line bg-paper text-ink hover:bg-accent-soft',
        destructive: 'bg-danger text-white hover:bg-danger-strong',
        ghost: 'text-muted hover:bg-accent-soft hover:text-ink',
      },
      size: { default: 'h-10 px-4 py-2', lg: 'h-12 px-6 py-3', icon: 'size-9 p-0', sm: 'h-8 px-3' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export const Button = defineComponent({
  inheritAttrs: false,
  props: { as: { default: 'button' }, asChild: Boolean, variant: String, size: String },
  setup:
    (props, { attrs, slots }) =>
    () =>
      h(
        Primitive,
        {
          ...attrs,
          as: props.as,
          asChild: props.asChild,
          class: cn(buttonVariants({ variant: props.variant, size: props.size }), attrs.class),
        },
        slots,
      ),
})
