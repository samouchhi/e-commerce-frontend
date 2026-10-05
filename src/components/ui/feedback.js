// shadcn-vue feedback primitives, adapted to JavaScript and storefront tokens.
import { defineComponent, h } from 'vue'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils.js'
import { Button } from './button.js'

const primitive = (tag, classes, defaults = {}) =>
  defineComponent({
    inheritAttrs: false,
    setup:
      (_, { attrs, slots }) =>
      () =>
        h(tag, { ...defaults, ...attrs, class: cn(classes, attrs.class) }, slots.default?.()),
  })

const alertVariants = cva('group relative w-full rounded-lg border p-4 text-left', {
  variants: {
    variant: {
      default: 'border-warning-line bg-warning-soft text-ink',
      error: 'border-danger-line bg-danger-soft text-danger',
      success: 'border-success-line bg-success-soft text-success',
    },
  },
  defaultVariants: { variant: 'default' },
})

export const Alert = defineComponent({
  inheritAttrs: false,
  props: { variant: { default: 'default' } },
  setup:
    (props, { attrs, slots }) =>
    () =>
      h(
        'div',
        {
          role: 'alert',
          ...attrs,
          'data-variant': props.variant,
          class: cn(alertVariants({ variant: props.variant }), attrs.class),
        },
        slots.default?.(),
      ),
})
export const AlertTitle = primitive('h3', 'm-0 text-sm font-semibold leading-tight')
export const AlertDescription = primitive(
  'div',
  'text-sm leading-relaxed text-muted group-data-[variant=error]:text-danger group-data-[variant=success]:text-success',
)
export const Skeleton = primitive(
  'div',
  'animate-pulse rounded-md bg-accent-soft motion-reduce:animate-none',
  { 'aria-hidden': 'true' },
)
export const Empty = primitive(
  'div',
  'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line p-6 text-center',
)
export const EmptyTitle = primitive('h3', 'm-0 text-sm font-semibold text-ink')
export const EmptyDescription = primitive('p', 'm-0 text-sm leading-relaxed text-muted')

export const CheckoutFeedback = defineComponent({
  props: { title: String, description: String, action: String, busy: Boolean },
  emits: ['retry'],
  setup:
    (props, { emit }) =>
    () =>
      h(
        Alert,
        { class: 'rounded-2xl border-danger-line bg-danger-soft p-4' },
        {
          default: () => [
            h('div', { class: 'flex items-start gap-3' }, [
              h(
                'svg',
                {
                  class: 'mt-0.5 size-5 shrink-0 text-danger',
                  viewBox: '0 0 24 24',
                  fill: 'none',
                  stroke: 'currentColor',
                  'stroke-width': 1.8,
                  'aria-hidden': 'true',
                },
                [h('circle', { cx: 12, cy: 12, r: 9 }), h('path', { d: 'M12 7v6m0 3v1' })],
              ),
              h('div', { class: 'grid min-w-0 gap-2' }, [
                h(
                  AlertTitle,
                  { class: props.description ? 'sr-only' : '' },
                  { default: () => props.title },
                ),
                h(AlertDescription, { class: 'text-ink' }, { default: () => props.description }),
                props.action
                  ? h(
                      Button,
                      {
                        type: 'button',
                        variant: 'outline',
                        size: 'sm',
                        disabled: props.busy,
                        class: 'justify-self-start',
                        onClick: () => emit('retry'),
                      },
                      { default: () => props.action },
                    )
                  : null,
              ]),
            ]),
          ],
        },
      ),
})
