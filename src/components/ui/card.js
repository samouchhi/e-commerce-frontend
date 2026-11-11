// shadcn-vue Card composition using the storefront's existing design tokens.
import { defineComponent, h } from 'vue'
import { cn } from '../../lib/utils.js'

const primitive = (tag, classes) =>
  defineComponent({
    inheritAttrs: false,
    props: { as: { default: tag } },
    setup:
      (props, { attrs, slots }) =>
      () =>
        h(props.as, { ...attrs, class: cn(classes, attrs.class) }, slots.default?.()),
  })

export const Card = primitive('div', 'min-w-0 rounded-2xl border border-line bg-paper text-ink')
export const CardHeader = primitive('div', 'grid min-w-0 gap-2 p-5 sm:p-6')
export const CardTitle = primitive('h2', 'm-0 text-xl font-semibold leading-snug tracking-tight')
export const CardDescription = primitive('p', 'm-0 text-sm leading-relaxed text-muted')
export const CardContent = primitive('div', 'min-w-0 px-5 pb-5 sm:px-6 sm:pb-6')
export const CardFooter = primitive('div', 'flex items-center gap-3 px-5 pb-5 sm:px-6 sm:pb-6')
