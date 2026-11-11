// Reka supplies tab roles, roving focus, and arrow-key navigation.
import { defineComponent, h } from 'vue'
import { TabsRoot, TabsList as List, TabsTrigger as Trigger, TabsContent as Content } from 'reka-ui'
import { cn } from '../../lib/utils.js'
export { TabsRoot as Tabs }

const styled = (component, classes) =>
  defineComponent({
    inheritAttrs: false,
    setup:
      (_, { attrs, slots }) =>
      () =>
        h(component, { ...attrs, class: cn(classes, attrs.class) }, slots),
  })
export const TabsList = styled(
  List,
  'inline-flex max-w-full items-center gap-1 rounded-xl bg-accent-soft p-1',
)
export const TabsTrigger = styled(
  Trigger,
  'inline-flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 data-[state=active]:bg-paper data-[state=active]:text-ink data-[state=active]:shadow-sm disabled:pointer-events-none disabled:opacity-50 sm:px-4',
)
export const TabsContent = styled(
  Content,
  'mt-6 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4',
)
