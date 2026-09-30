// shadcn-vue feedback primitives, adapted to JavaScript and storefront tokens.
import { defineComponent, h } from 'vue'
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

export const Alert = primitive(
  'div',
  'relative w-full rounded-lg border border-warning-line bg-warning-soft p-4 text-left text-ink',
  { role: 'alert' },
)
export const AlertTitle = primitive('h3', 'm-0 text-sm font-semibold leading-tight')
export const AlertDescription = primitive('div', 'text-sm leading-relaxed text-muted')
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
        {},
        {
          default: () => [
            h('div', { class: 'flex items-start gap-3' }, [
              h(
                'svg',
                {
                  class: 'size-5 shrink-0 text-warning',
                  viewBox: '0 0 24 24',
                  fill: 'none',
                  stroke: 'currentColor',
                  'stroke-width': 1.8,
                  'aria-hidden': 'true',
                },
                [h('circle', { cx: 12, cy: 12, r: 9 }), h('path', { d: 'M12 7v6m0 3v1' })],
              ),
              h('div', { class: 'grid min-w-0 gap-2' }, [
                h(AlertTitle, {}, { default: () => props.title }),
                h(AlertDescription, {}, { default: () => props.description }),
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
