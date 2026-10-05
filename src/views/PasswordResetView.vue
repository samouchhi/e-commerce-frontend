<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { forgotPassword, resetPassword } from '../services/authService'
import { t } from '../services/i18n'

const route = useRoute()
const isReset = computed(() => route.name === 'reset-password')
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const password = ref('')
const confirmation = ref('')
const submitting = ref(false)
const completed = ref(false)
const statusKey = ref('')
const errorKey = ref('')
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const missingLink = computed(() => isReset.value && (!token.value || !email.value))
const inputClass =
  'min-h-[3.2rem] w-full rounded-[0.35rem] border border-line bg-white px-4 py-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'

watch(
  () => route.fullPath,
  () => {
    email.value = typeof route.query.email === 'string' ? route.query.email : ''
    password.value = ''
    confirmation.value = ''
    completed.value = false
    statusKey.value = ''
    errorKey.value = ''
  },
)

const submit = async () => {
  errorKey.value = ''
  statusKey.value = ''
  if (isReset.value && password.value !== confirmation.value) {
    errorKey.value = 'login.passwordsMismatch'
    return
  }
  submitting.value = true
  try {
    if (isReset.value) {
      await resetPassword({
        email: email.value,
        token: token.value,
        password: password.value,
        password_confirmation: confirmation.value,
      })
      localStorage.removeItem('auth-token')
      localStorage.removeItem('auth-user')
      window.dispatchEvent(new Event('auth-updated'))
      completed.value = true
      password.value = ''
      confirmation.value = ''
      statusKey.value = 'passwordReset.success'
    } else {
      await forgotPassword(email.value)
      statusKey.value = 'passwordReset.sent'
    }
  } catch (error) {
    errorKey.value =
      error.status === 429
        ? 'passwordReset.tooMany'
        : error.details?.code === 'invalid_reset_link'
          ? 'passwordReset.invalid'
          : 'login.genericError'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="flex min-h-[calc(100vh-6rem)] items-center justify-center px-5 py-10">
    <section
      class="w-full max-w-[470px] border-t-[3px] border-accent pt-6"
      aria-labelledby="reset-title"
    >
      <h1 id="reset-title" class="mb-3 text-[clamp(1.6rem,3vw,2.25rem)]">
        {{ t(isReset ? 'passwordReset.resetTitle' : 'passwordReset.forgotTitle') }}
      </h1>
      <p class="mb-7 leading-relaxed text-muted">
        {{ t(isReset ? 'passwordReset.resetHint' : 'passwordReset.hint') }}
      </p>
      <form v-if="!completed && !missingLink" class="grid gap-5" @submit.prevent="submit">
        <label v-if="!isReset" class="grid gap-2 text-sm font-bold text-ink">
          {{ t('login.email') }}
          <input
            v-model.trim="email"
            type="email"
            autocomplete="email"
            required
            :class="inputClass"
            :placeholder="t('login.emailPlaceholder')"
          />
        </label>
        <template v-if="isReset">
          <label class="grid gap-2 text-sm font-bold text-ink">
            {{ t('passwordReset.newPassword') }}
            <input
              v-model="password"
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
              :class="inputClass"
            />
          </label>
          <label class="grid gap-2 text-sm font-bold text-ink">
            {{ t('login.confirmPassword') }}
            <input
              v-model="confirmation"
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
              :class="inputClass"
            />
          </label>
        </template>
        <button
          type="submit"
          :disabled="submitting"
          class="mt-2 w-full cursor-pointer rounded border-0 bg-accent p-4 text-center text-sm font-bold text-white hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-65"
        >
          {{
            t(
              submitting
                ? 'login.pleaseWait'
                : isReset
                  ? 'passwordReset.resetButton'
                  : 'passwordReset.sendButton',
            )
          }}
        </button>
      </form>
      <p
        v-if="statusKey"
        role="status"
        class="mt-5 bg-success-soft px-4 py-3 leading-relaxed text-success"
      >
        {{ t(statusKey) }}
      </p>
      <p
        v-if="errorKey || missingLink"
        role="alert"
        class="mt-5 border-l-[3px] border-danger bg-[#fbe9e4] px-4 py-3 leading-relaxed text-[#7e271c]"
      >
        {{ t(missingLink ? 'passwordReset.invalid' : errorKey) }}
      </p>
      <RouterLink
        v-if="isReset && !completed && (missingLink || errorKey === 'passwordReset.invalid')"
        :to="{ name: 'forgot-password', query: { email } }"
        class="mt-5 block text-sm font-bold text-ink underline underline-offset-4 hover:text-accent"
        >{{ t('passwordReset.requestNew') }}</RouterLink
      >
      <RouterLink
        to="/login"
        class="mt-6 inline-block text-sm font-bold text-ink underline underline-offset-4 hover:text-accent"
        >{{ t('passwordReset.back') }}</RouterLink
      >
    </section>
  </main>
</template>
