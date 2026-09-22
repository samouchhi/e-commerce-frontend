<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login, register, resendOtp, verifyOtp } from '../services/authService'
import { getSettings } from '../services/settingsService'
import { t } from '../services/i18n'

const labelClass = 'grid gap-[0.55rem] text-[0.78rem] leading-[1.2] font-bold text-ink uppercase'
const inputClass =
  'w-full min-h-[3.2rem] rounded-[0.35rem] border border-line bg-white pr-[0.9rem] pl-[2.85rem] py-3 text-base text-ink transition-[border-color,box-shadow] duration-[160ms] focus:border-accent focus:shadow-[0_0_0_3px_rgba(17,17,17,0.16)] focus:outline-none'
const OTP_LENGTH = 6

const route = useRoute()
const router = useRouter()
const siteName = ref('')
const isRegistering = ref(route.query.mode === 'register')
const isVerifyingOtp = ref(false)
const isSubmitting = ref(false)
const isResending = ref(false)
const errorMessage = ref('')
const statusMessage = ref('')
const form = ref({ email: '', password: '', password_confirmation: '' })
const otpDigits = ref(Array(OTP_LENGTH).fill(''))
const otpInputs = ref([])
const resendSeconds = ref(60)
let resendTimer

const otpCode = computed(() => otpDigits.value.join(''))
const isOtpComplete = computed(() => otpCode.value.length === OTP_LENGTH)
const resendTime = computed(() => {
  const minutes = Math.floor(resendSeconds.value / 60)
  const seconds = resendSeconds.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})
const withValues = (key, values) =>
  Object.entries(values).reduce(
    (message, [name, value]) => message.replace(`{${name}}`, value),
    t(key),
  )

const clearResendTimer = () => window.clearInterval(resendTimer)
const startResendTimer = () => {
  clearResendTimer()
  resendSeconds.value = 60
  resendTimer = window.setInterval(() => {
    if (resendSeconds.value) resendSeconds.value -= 1
    else clearResendTimer()
  }, 1000)
}
const focusOtp = (index) => nextTick(() => otpInputs.value[index]?.focus())
const fillOtp = (value, start = 0) => {
  const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH - start)
  if (!digits) return
  const nextDigits = [...otpDigits.value]
  digits.split('').forEach((digit, index) => (nextDigits[start + index] = digit))
  otpDigits.value = nextDigits
  focusOtp(Math.min(start + digits.length, OTP_LENGTH - 1))
}
const updateOtp = (event, index) => {
  const value = event.target.value.replace(/\D/g, '')
  if (value.length > 1) return fillOtp(value, index)
  otpDigits.value[index] = value
  if (value && index < OTP_LENGTH - 1) focusOtp(index + 1)
}
const handleOtpKeydown = (event, index) => {
  if (event.key === 'Backspace' && !otpDigits.value[index] && index > 0) {
    event.preventDefault()
    otpDigits.value[index - 1] = ''
    focusOtp(index - 1)
  }
  if (event.key === 'ArrowLeft' && index > 0) focusOtp(index - 1)
  if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) focusOtp(index + 1)
}

const resendCode = async () => {
  errorMessage.value = ''
  statusMessage.value = ''
  isResending.value = true
  try {
    await resendOtp(form.value.email)
    otpDigits.value = Array(OTP_LENGTH).fill('')
    startResendTimer()
    focusOtp(0)
    statusMessage.value = t('login.newCodeSent')
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isResending.value = false
  }
}

const apiError = () => t('login.genericError')

const startVerification = (email, message = '') => {
  form.value.email = email
  otpDigits.value = Array(OTP_LENGTH).fill('')
  errorMessage.value = ''
  statusMessage.value = message
  isVerifyingOtp.value = true
  startResendTimer()
  focusOtp(0)
}

const submit = async () => {
  errorMessage.value = ''
  if (isVerifyingOtp.value) {
    isSubmitting.value = true
    try {
      await verifyOtp({ email: form.value.email, code: otpCode.value })
      router.push(route.query.redirect || '/checkout')
    } catch (error) {
      errorMessage.value = apiError(error)
    } finally {
      isSubmitting.value = false
    }
    return
  }
  if (isRegistering.value && form.value.password !== form.value.password_confirmation) {
    errorMessage.value = t('login.passwordsMismatch')
    return
  }
  isSubmitting.value = true
  try {
    if (isRegistering.value) {
      const response = await register({
        email: form.value.email,
        password: form.value.password,
        password_confirmation: form.value.password_confirmation,
      })
      startVerification(response.email || form.value.email)
    } else {
      await login({ email: form.value.email, password: form.value.password })
      router.push(route.query.redirect || '/checkout')
    }
  } catch (error) {
    if (!isRegistering.value && error.status === 403 && error.details?.email) {
      startVerification(error.details.email, apiError(error))
      return
    }
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

const toggleMode = () => {
  isRegistering.value = !isRegistering.value
  isVerifyingOtp.value = false
  clearResendTimer()
  errorMessage.value = ''
  statusMessage.value = ''
  form.value.password_confirmation = ''
  otpDigits.value = Array(OTP_LENGTH).fill('')
}

const changeEmail = () => {
  isVerifyingOtp.value = false
  clearResendTimer()
  errorMessage.value = ''
  statusMessage.value = ''
  otpDigits.value = Array(OTP_LENGTH).fill('')
}

onMounted(async () => {
  try {
    siteName.value = (await getSettings()).site_name || ''
  } catch {
    siteName.value = ''
  }
})

onUnmounted(clearResendTimer)
</script>

<template>
  <main class="flex min-h-[calc(100vh-6rem)] items-center justify-center px-5 py-10">
    <section
      class="w-full max-w-[470px] border-t-[3px] border-accent pt-6"
      aria-labelledby="auth-title"
    >
      <!-- <p v-if="siteName" class="eyebrow">{{ siteName }} account</p> -->
      <h1 id="auth-title" class="mb-3 text-[clamp(1.6rem,3vw,2.25rem)]">
        {{
          isVerifyingOtp
            ? t('login.verifyTitle')
            : isRegistering
              ? t('login.createTitle')
              : t('login.title')
        }}
      </h1>
      <!-- <p class="mb-8 max-w-md leading-[1.6] text-muted">
        {{ isRegistering ? 'Save your details for a smoother checkout.' : 'Sign in to continue.' }}
      </p> -->

      <form class="grid gap-5" @submit.prevent="submit">
        <label v-if="!isVerifyingOtp" :class="labelClass">
          {{ t('login.email') }}
          <div class="group relative">
            <svg
              class="pointer-events-none absolute top-1/2 left-4 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-muted transition-colors duration-[160ms] group-focus-within:text-ink"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            <input
              v-model.trim="form.email"
              :placeholder="t('login.emailPlaceholder')"
              required
              type="email"
              autocomplete="email"
              :class="inputClass"
            />
          </div>
        </label>
        <label v-if="!isVerifyingOtp" :class="labelClass">
          {{ t('login.password') }}
          <div class="group relative">
            <svg
              class="pointer-events-none absolute top-1/2 left-4 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-muted transition-colors duration-[160ms] group-focus-within:text-ink"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <input
              v-model="form.password"
              :placeholder="t('login.passwordPlaceholder')"
              required
              type="password"
              :autocomplete="isRegistering ? 'new-password' : 'current-password'"
              minlength="8"
              :class="inputClass"
            />
          </div>
        </label>
        <label v-if="isRegistering && !isVerifyingOtp" :class="labelClass">
          {{ t('login.confirmPassword') }}
          <div class="group relative">
            <svg
              class="pointer-events-none absolute top-1/2 left-4 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-muted transition-colors duration-[160ms] group-focus-within:text-ink"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <input
              :placeholder="t('login.confirmPasswordPlaceholder')"
              v-model="form.password_confirmation"
              required
              type="password"
              autocomplete="new-password"
              minlength="8"
              :class="inputClass"
            />
          </div>
        </label>
        <template v-if="isVerifyingOtp">
          <p class="-mb-1 max-w-sm leading-[1.6] text-muted">
            {{ withValues('login.verificationSent', { email: form.email }) }}
          </p>
          <fieldset class="m-0 border-0 p-0" aria-describedby="otp-resend">
            <legend class="sr-only">{{ t('login.verificationLegend') }}</legend>
            <div class="grid grid-cols-6 gap-2 sm:gap-3">
              <input
                v-for="(_, index) in otpDigits"
                :key="index"
                :ref="(element) => (otpInputs[index] = element)"
                :value="otpDigits[index]"
                :aria-label="withValues('login.otpDigit', { index: index + 1, length: OTP_LENGTH })"
                :autocomplete="index === 0 ? 'one-time-code' : 'off'"
                class="h-12 min-w-0 rounded-[0.35rem] border border-line bg-white text-center text-lg font-bold tabular-nums text-ink transition-[border-color,box-shadow] duration-[160ms] focus:border-ink focus:shadow-[0_0_0_3px_rgba(17,17,17,0.14)] focus:outline-none"
                inputmode="numeric"
                pattern="[0-9]*"
                required
                type="text"
                @input="updateOtp($event, index)"
                @keydown="handleOtpKeydown($event, index)"
                @paste.prevent="fillOtp($event.clipboardData.getData('text'), index)"
              />
            </div>
          </fieldset>
          <p
            id="otp-resend"
            class="-mt-2 flex items-center justify-between gap-3 text-xs text-muted"
            aria-live="polite"
          >
            <span>{{ t('login.spamHint') }}</span>
            <span v-if="resendSeconds" class="shrink-0 tabular-nums">{{
              withValues('login.resendIn', { time: resendTime })
            }}</span>
            <button
              v-else
              class="shrink-0 cursor-pointer border-0 bg-transparent p-0 font-bold text-ink underline underline-offset-4 hover:text-accent focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:text-muted"
              type="button"
              :disabled="isResending"
              @click="resendCode"
            >
              {{ isResending ? t('login.sending') : t('login.resendOtp') }}
            </button>
          </p>
        </template>
        <p
          v-if="statusMessage"
          class="m-0 bg-success-soft px-4 py-[0.8rem] leading-[1.5] text-success"
          role="status"
        >
          {{ statusMessage }}
        </p>
        <p
          v-if="errorMessage"
          class="m-0 border-l-[3px] border-danger bg-[#fbe9e4] px-4 py-[0.8rem] leading-[1.5] text-[#7e271c]"
          role="alert"
        >
          {{ errorMessage }}
        </p>
        <button
          class="rounded mt-2 w-full cursor-pointer border-0 bg-accent p-4 text-center text-[0.8rem] font-bold text-white uppercase no-underline hover:bg-accent-hover focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-wait disabled:bg-muted disabled:opacity-65"
          type="submit"
          :disabled="isSubmitting || isResending || (isVerifyingOtp && !isOtpComplete)"
        >
          {{
            isSubmitting
              ? t('login.pleaseWait')
              : isVerifyingOtp
                ? t('login.verifyCode')
                : isRegistering
                  ? t('login.createAccount')
                  : t('login.logIn')
          }}
        </button>
      </form>

      <button
        v-if="isVerifyingOtp"
        class="mt-6 cursor-pointer border-0 bg-transparent p-0 text-[0.68rem] font-bold text-ink underline underline-offset-4 hover:text-accent focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-accent"
        type="button"
        @click="changeEmail"
      >
        {{ t('login.useDifferentEmail') }}
      </button>
      <button
        v-else
        class="mt-6 cursor-pointer border-0 bg-transparent p-0 text-[0.88rem] font-bold text-ink underline underline-offset-4 hover:text-accent focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-accent"
        type="button"
        @click="toggleMode"
      >
        {{ isRegistering ? t('login.switchToLogin') : t('login.switchToRegister') }}
      </button>
    </section>
  </main>
</template>
