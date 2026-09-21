<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const props = defineProps({ isLoggedIn: Boolean })

const linkBase =
  'relative flex min-h-[4.25rem] flex-col items-center justify-center gap-[0.34rem] px-[0.2rem] py-[0.55rem] text-[0.6rem] font-bold tracking-[0.06em] uppercase no-underline transition-colors duration-[180ms] hover:text-accent-deep focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-accent motion-reduce:transition-none'
const linkClass = `${linkBase} text-muted`
const linkActiveClass = `${linkBase} text-accent before:absolute before:top-0 before:h-[0.2rem] before:w-[1.6rem] before:rounded-full before:bg-accent before:content-['']`

const tabs = computed(() => [
  { name: 'Home', to: '/', match: (path) => path === '/' },
  { name: 'Product', to: '/products', match: (path) => path.startsWith('/products') },
  { name: 'Promotion', to: '/promotion', match: (path) => path.startsWith('/promotion') },
  {
    name: 'Profile',
    to: props.isLoggedIn ? '/orders' : '/login',
    match: (path) => path.startsWith('/login') || path.startsWith('/orders'),
  },
])

const isActive = (tab) => tab.match(route.path)
</script>

<template>
  <nav
    class="hidden max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-15 max-md:grid max-md:grid-cols-4 max-md:items-stretch max-md:border-t max-md:border-line max-md:bg-white/94 max-md:pb-[env(safe-area-inset-bottom)] max-md:shadow-[0_-6px_22px_rgba(0,0,0,0.08)] max-md:backdrop-blur-[14px]"
    aria-label="Mobile navigation"
  >
    <RouterLink
      v-for="tab in tabs"
      :key="tab.name"
      :to="tab.to"
      :class="isActive(tab) ? linkActiveClass : linkClass"
      :aria-current="isActive(tab) ? 'page' : undefined"
    >
      <svg
        class="h-[1.45rem] w-[1.45rem] fill-none stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <template v-if="tab.name === 'Home'">
          <path d="M4 10.5 12 4l8 6.5" />
          <path d="M6 10v9h12v-9" />
        </template>
        <template v-else-if="tab.name === 'Product'">
          <path d="M4 12.5 12.5 4H20v7.5L11.5 20 4 12.5Z" />
          <circle cx="16.5" cy="7.5" r="1.4" />
        </template>
        <template v-else-if="tab.name === 'Promotion'">
          <path d="M6.5 17.5 17.5 6.5" />
          <circle cx="7.8" cy="7.8" r="2.6" />
          <circle cx="16.2" cy="16.2" r="2.6" />
        </template>
        <template v-else>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5" />
        </template>
      </svg>
      <span>{{ tab.name }}</span>
    </RouterLink>
  </nav>
</template>
