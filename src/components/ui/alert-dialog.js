// shadcn-vue AlertDialog composition with Reka's focus and keyboard handling.
import { defineComponent, h } from 'vue'
import {
  AlertDialogRoot,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent as Content,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from 'reka-ui'

export {
  AlertDialogRoot as AlertDialog,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
}
export const AlertDialogContent = defineComponent({
  inheritAttrs: false,
  setup:
    (_, { attrs, slots }) =>
    () =>
      h(
        AlertDialogPortal,
        {},
        {
          default: () => [
            h(AlertDialogOverlay, { class: 'fixed inset-0 z-50 bg-ink/35 backdrop-blur-sm' }),
            h(
              Content,
              {
                ...attrs,
                class:
                  'fixed top-1/2 left-1/2 z-50 grid max-h-[90dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-3xl bg-paper p-6 text-ink shadow-[0_24px_100px_rgb(0_0_0/12%)]',
              },
              slots,
            ),
          ],
        },
      ),
})
