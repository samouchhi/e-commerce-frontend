import { defineComponent, h } from 'vue'
import { cn } from '../../lib/utils.js'

export const Spinner = defineComponent({
  inheritAttrs: false,
  setup:
    (_, { attrs }) =>
    () =>
      h(
        'svg',
        {
          ...attrs,
          class: cn('animate-spin motion-reduce:animate-none', attrs.class),
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 2,
          'stroke-linecap': 'round',
          'aria-hidden': 'true',
        },
        [h('path', { d: 'M12 3a9 9 0 1 1-9 9' })],
      ),
})
