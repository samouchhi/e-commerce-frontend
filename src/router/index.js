import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ProductDetailView from '../views/ProductDetailView.vue'
import CheckoutView from '../views/CheckoutView.vue'
import LoginView from '../views/LoginView.vue'
import { isAuthenticated } from '../services/authService'
import { guestMiddleware } from '../services/authNavigation'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { titleKey: 'nav.home' },
    },
    {
      path: '/products',
      name: 'products',
      component: () => import('../views/ProductsView.vue'),
      meta: { titleKey: 'products.title' },
    },
    {
      path: '/products/:slug',
      name: 'product-detail',
      component: ProductDetailView,
      meta: { titleKey: 'products.title' },
    },
    {
      path: '/promotion',
      name: 'promotion',
      component: () => import('../views/PromotionView.vue'),
      meta: { titleKey: 'promotions.title' },
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('../views/CategoryView.vue'),
      meta: { titleKey: 'nav.category' },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true, titleKey: 'login.title' },
    },
    {
      path: '/checkout',
      name: 'checkout',
      component: CheckoutView,
      meta: { requiresAuth: true, titleKey: 'checkout.title' },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/PasswordResetView.vue'),
      meta: { titleKey: 'passwordReset.forgotTitle' },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('../views/PasswordResetView.vue'),
      meta: { titleKey: 'passwordReset.resetTitle' },
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: () => import('../views/ChangePasswordView.vue'),
      meta: { requiresAuth: true, titleKey: 'changePassword.title' },
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('../views/OrderView.vue'),
      meta: { requiresAuth: true, titleKey: 'orders.title' },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
      meta: { titleKey: 'store.about' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
      meta: { titleKey: 'store.notFound' },
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path !== from.path) return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const guestRedirect = await guestMiddleware(to)
  if (guestRedirect) return guestRedirect
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

router.afterEach((to, from) => {
  if (!from.name || to.path === from.path) return
  nextTick(() => document.getElementById('main-content')?.focus({ preventScroll: true }))
})

export default router
