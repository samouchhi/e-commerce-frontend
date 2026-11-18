import { defineComponent, h } from 'vue'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent as Content,
  DropdownMenuItem as Item,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from 'reka-ui'
import { cn } from '../../lib/utils.js'
export {
  DropdownMenuRoot as DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSeparator,
}
export const DropdownMenuContent = defineComponent({
  inheritAttrs: false,
  setup:
    (_, { attrs, slots }) =>
    () =>
      h(
        DropdownMenuPortal,
        {},
        {
          default: () =>
            h(
              Content,
              {
                sideOffset: 8,
                collisionPadding: 16,
                ...attrs,
                class: cn(
                  'z-50 max-h-[var(--reka-dropdown-menu-content-available-height)] w-60 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-line bg-paper p-1.5 text-ink shadow-[0_12px_32px_rgb(0_0_0/12%)]',
                  attrs.class,
                ),
              },
              slots,
            ),
        },
      ),
})
export const DropdownMenuItem = defineComponent({
  inheritAttrs: false,
  setup:
    (_, { attrs, slots }) =>
    () =>
      h(
        Item,
        {
          ...attrs,
          class: cn(
            'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm no-underline outline-none data-[highlighted]:bg-accent-soft data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            attrs.class,
          ),
        },
        slots,
      ),
})
