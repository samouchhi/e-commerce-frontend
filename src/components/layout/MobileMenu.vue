<script setup>
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { t } from '../../services/i18n'
import StoreIcon from '../icons/StoreIcon.vue'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu'
defineProps({ isLoggedIn: Boolean })
const emit = defineEmits(['logout'])
const route = useRoute()
const open = ref(false)
watch(
  () => route.fullPath,
  () => {
    open.value = false
  },
)
const links = [
  { to: '/', key: 'nav.home', icon: 'home' },
  { to: '/products', key: 'nav.products', icon: 'bag' },
  { to: '/promotion', key: 'nav.promotions', icon: 'tag' },
  { to: '/categories', key: 'nav.category', icon: 'grid' },
]
</script>
<template>
  <div class="order-3 md:hidden">
    <DropdownMenu v-model:open="open">
      <DropdownMenuTrigger as-child>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="min-h-11 min-w-11 [&_svg]:size-5"
          :aria-label="t('nav.more')"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" :aria-label="t('nav.more')">
        <DropdownMenuGroup>
          <DropdownMenuItem v-for="link in links" :key="link.to" as-child>
            <RouterLink :to="link.to" :aria-current="route.path === link.to ? 'page' : undefined"
              ><StoreIcon :name="link.icon" class="size-4 text-muted" />{{
                t(link.key)
              }}</RouterLink
            >
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator class="my-1 h-px bg-line" />
        <DropdownMenuGroup v-if="isLoggedIn">
          <DropdownMenuItem as-child
            ><RouterLink to="/orders"
              ><StoreIcon name="package" class="size-4 text-muted" />{{
                t('profile.myOrders')
              }}</RouterLink
            ></DropdownMenuItem
          >
          <DropdownMenuItem as-child
            ><RouterLink to="/change-password"
              ><StoreIcon name="lock" class="size-4 text-muted" />{{
                t('changePassword.title')
              }}</RouterLink
            ></DropdownMenuItem
          >
          <DropdownMenuItem @select="emit('logout')"
            ><StoreIcon name="logout" class="size-4 text-muted" />{{
              t('profile.logOut')
            }}</DropdownMenuItem
          >
        </DropdownMenuGroup>
        <DropdownMenuGroup v-else>
          <DropdownMenuItem as-child
            ><RouterLink to="/login"
              ><StoreIcon name="login" class="size-4 text-muted" />{{
                t('profile.logIn')
              }}</RouterLink
            ></DropdownMenuItem
          >
          <DropdownMenuItem as-child
            ><RouterLink to="/login?mode=register"
              ><StoreIcon name="user" class="size-4 text-muted" />{{
                t('profile.createAccount')
              }}</RouterLink
            ></DropdownMenuItem
          >
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
