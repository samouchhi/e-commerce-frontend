<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { t } from '../../services/i18n'
import StoreIcon from '../icons/StoreIcon.vue'

const route = useRoute()
const props = defineProps({ isLoggedIn: Boolean })

const linkBase =
  'relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-1.5 text-xs leading-4 font-semibold no-underline transition-colors duration-150 hover:text-accent-deep focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent motion-reduce:transition-none'
const linkClass = `${linkBase} text-muted`
const linkActiveClass = `${linkBase} text-accent [&_svg]:rounded-lg [&_svg]:bg-accent-soft`

const tabs = computed(() => [
  { key: 'home', name: t('nav.home'), to: '/', match: (path) => path === '/' },
  {
    key: 'products',
    name: t('nav.products'),
    to: '/products',
    match: (path) => path.startsWith('/products'),
  },
  {
    key: 'promotions',
    name: t('nav.promotions'),
    to: '/promotion',
    match: (path) => path.startsWith('/promotion'),
  },
  {
    key: 'profile',
    name: t('nav.profile'),
    to: props.isLoggedIn ? '/orders' : '/login',
    match: (path) =>
      ['/login', '/orders', '/change-password', '/forgot-password', '/reset-password'].some(
        (prefix) => path.startsWith(prefix),
      ),
  },
])

const isActive = (tab) => tab.match(route.path)
</script>

<template>
  <nav
    v-if="route.name !== 'product-detail'"
    class="hidden max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-15 max-md:grid max-md:grid-cols-4 max-md:items-stretch max-md:border-t max-md:border-line max-md:bg-white/94 max-md:pb-[env(safe-area-inset-bottom)] max-md:shadow-[0_-6px_22px_rgba(0,0,0,0.08)] max-md:backdrop-blur-[14px]"
    :aria-label="t('nav.more')"
  >
    <RouterLink
      v-for="tab in tabs"
      :key="tab.key"
      :to="tab.to"
      :class="isActive(tab) ? linkActiveClass : linkClass"
      :aria-current="isActive(tab) ? 'page' : undefined"
    >
      <StoreIcon
        :name="{ home: 'home', products: 'bag', promotions: 'tag', profile: 'user' }[tab.key]"
        class="size-8 p-1"
      />
      <span>{{ tab.name }}</span>
    </RouterLink>
  </nav>
</template>
