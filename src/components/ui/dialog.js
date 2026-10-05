// shadcn-vue dialog composition, using the project's installed Reka primitives.
import { defineComponent, h } from 'vue'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent as Content,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui'
import { cn } from '../../lib/utils.js'
export { DialogRoot as Dialog, DialogTitle, DialogDescription, DialogClose }
export const DialogContent = defineComponent({
  inheritAttrs: false,
  props: { sheet: Boolean },
  setup:
    (props, { attrs, slots }) =>
    () =>
      h(
        DialogPortal,
        {},
        {
          default: () => [
            h(DialogOverlay, {
              class: cn('fixed inset-0 z-50 bg-ink/35', !props.sheet && 'backdrop-blur-sm'),
            }),
            h(
              Content,
              {
                ...attrs,
                class: cn(
                  'fixed z-50 bg-paper text-ink shadow-[0_24px_100px_rgb(0_0_0/12%)] focus:outline-none',
                  props.sheet
                    ? 'inset-y-0 right-0 flex w-full max-w-[430px] flex-col border-l border-line'
                    : 'left-1/2 top-1/2 grid max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-6 overflow-y-auto rounded-3xl p-6 sm:p-8',
                  attrs.class,
                ),
              },
              slots,
            ),
          ],
        },
      ),
})
