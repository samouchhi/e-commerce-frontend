<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login, register, resendOtp, verifyOtp } from '../services/authService'
import { getSettings } from '../services/settingsService'
import { t } from '../services/i18n'
import { Button } from '../components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/card'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldSet,
  FieldLegend,
  Separator,
} from '../components/ui/field'
import { Input } from '../components/ui/input'
import { PasswordInput } from '../components/ui/password-input'
import { Alert, AlertDescription } from '../components/ui/feedback'
import { Spinner } from '../components/ui/spinner'

const OTP_LENGTH = 6

const route = useRoute()
const router = useRouter()
const siteName = ref('')
const isRegistering = ref(route.query.mode === 'register')
const isVerifyingOtp = ref(false)
const isSubmitting = ref(false)
const isResending = ref(false)
const errorMessage = ref('')
const confirmationInvalid = ref(false)
const statusMessage = ref('')
const statusVariant = ref('success')
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
const focusOtp = (index) => nextTick(() => otpInputs.value[index]?.$el?.focus())
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
  if (isSubmitting.value || isResending.value || resendSeconds.value) return
  errorMessage.value = ''
  statusMessage.value = ''
  isResending.value = true
  try {
    await resendOtp(form.value.email)
    otpDigits.value = Array(OTP_LENGTH).fill('')
    startResendTimer()
    focusOtp(0)
    statusMessage.value = t('login.newCodeSent')
    statusVariant.value = 'success'
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isResending.value = false
  }
}

const apiError = (error) =>
  t(error.status === 401 ? 'login.invalidCredentials' : 'login.genericError')

const startVerification = (email, message = '') => {
  form.value.email = email
  otpDigits.value = Array(OTP_LENGTH).fill('')
  errorMessage.value = ''
  statusMessage.value = message
  statusVariant.value = message ? 'error' : 'success'
  isVerifyingOtp.value = true
  startResendTimer()
  focusOtp(0)
}

const submit = async () => {
  if (isSubmitting.value || isResending.value || (isVerifyingOtp.value && !isOtpComplete.value))
    return
  confirmationInvalid.value = false
  form.value.email = form.value.email.trim()
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
    confirmationInvalid.value = true
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
  if (isSubmitting.value || isResending.value) return
  confirmationInvalid.value = false
  isRegistering.value = !isRegistering.value
  isVerifyingOtp.value = false
  clearResendTimer()
  errorMessage.value = ''
  statusMessage.value = ''
  form.value.password_confirmation = ''
  otpDigits.value = Array(OTP_LENGTH).fill('')
}

const changeEmail = () => {
  if (isSubmitting.value || isResending.value) return
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
  <main class="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4 py-10 sm:px-6">
    <Card as="section" class="w-full max-w-md" aria-labelledby="auth-title">
      <CardHeader>
        <CardTitle as="h1" id="auth-title">
          {{
            isVerifyingOtp
              ? t('login.verifyTitle')
              : isRegistering
                ? t('login.createTitle')
                : t('login.title')
          }}
        </CardTitle>
        <CardDescription v-if="isVerifyingOtp" id="verification-description">
          {{ withValues('login.verificationSent', { email: form.email }) }}
        </CardDescription>
        <CardDescription v-else-if="siteName">{{ siteName }}</CardDescription>
      </CardHeader>
      <CardContent>
        <form :aria-busy="isSubmitting || isResending" @submit.prevent="submit">
          <FieldGroup>
            <Field v-if="!isVerifyingOtp" :data-disabled="isSubmitting">
              <FieldLabel for="auth-email">{{ t('login.email') }}</FieldLabel>
              <Input
                id="auth-email"
                v-model="form.email"
                name="email"
                :placeholder="t('login.emailPlaceholder')"
                required
                type="email"
                autocomplete="email"
                :disabled="isSubmitting"
              />
            </Field>
            <Field v-if="!isVerifyingOtp" :data-disabled="isSubmitting">
              <FieldLabel for="auth-password">{{ t('login.password') }}</FieldLabel>
              <PasswordInput
                :key="isRegistering ? 'register-password' : 'login-password'"
                id="auth-password"
                :label="t('login.password')"
                v-model="form.password"
                name="password"
                :placeholder="t('login.passwordPlaceholder')"
                required
                :autocomplete="isRegistering ? 'new-password' : 'current-password'"
                minlength="8"
                :disabled="isSubmitting"
              />
            </Field>
            <Field
              v-if="isRegistering && !isVerifyingOtp"
              :data-invalid="confirmationInvalid"
              :data-disabled="isSubmitting"
            >
              <FieldLabel for="auth-confirm-password">{{ t('login.confirmPassword') }}</FieldLabel>
              <PasswordInput
                id="auth-confirm-password"
                :label="t('login.confirmPassword')"
                v-model="form.password_confirmation"
                name="password_confirmation"
                :placeholder="t('login.confirmPasswordPlaceholder')"
                required
                autocomplete="new-password"
                minlength="8"
                :disabled="isSubmitting"
                :aria-invalid="confirmationInvalid"
                :aria-describedby="confirmationInvalid ? 'confirmation-error' : undefined"
                @update:model-value="confirmationInvalid = false"
              />
              <FieldError v-if="confirmationInvalid" id="confirmation-error">{{
                t('login.passwordsMismatch')
              }}</FieldError>
            </Field>
            <template v-if="isVerifyingOtp">
              <FieldSet
                aria-describedby="verification-description otp-resend"
                :disabled="isSubmitting || isResending"
              >
                <FieldLegend class="sr-only">{{ t('login.verificationLegend') }}</FieldLegend>
                <FieldGroup class="grid-cols-6 gap-2 sm:gap-3">
                  <Field
                    v-for="(_, index) in otpDigits"
                    :key="index"
                    :data-disabled="isSubmitting || isResending"
                  >
                    <Input
                      :ref="(element) => (otpInputs[index] = element)"
                      :model-value="otpDigits[index]"
                      :aria-label="
                        withValues('login.otpDigit', { index: index + 1, length: OTP_LENGTH })
                      "
                      :autocomplete="index === 0 ? 'one-time-code' : 'off'"
                      class="px-0 text-center"
                      inputmode="numeric"
                      pattern="[0-9]"
                      required
                      type="text"
                      :disabled="isSubmitting || isResending"
                      @input="updateOtp($event, index)"
                      @keydown="handleOtpKeydown($event, index)"
                      @paste.prevent="fillOtp($event.clipboardData.getData('text'), index)"
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
              <div
                id="otp-resend"
                class="flex flex-col items-start gap-2 text-sm text-muted"
                aria-live="polite"
              >
                <p class="m-0">{{ t('login.spamHint') }}</p>
                <span v-if="resendSeconds" class="tabular-nums">{{
                  withValues('login.resendIn', { time: resendTime })
                }}</span>
                <Button
                  v-else
                  variant="outline"
                  size="sm"
                  type="button"
                  :disabled="isResending || isSubmitting"
                  @click="resendCode"
                >
                  <Spinner v-if="isResending" data-icon="inline-start" />
                  {{ isResending ? t('login.sending') : t('login.resendOtp') }}
                </Button>
              </div>
            </template>
            <Alert v-if="statusMessage" :variant="statusVariant" role="status"
              ><AlertDescription>{{ statusMessage }}</AlertDescription></Alert
            >
            <Alert v-if="errorMessage" variant="error"
              ><AlertDescription>{{ errorMessage }}</AlertDescription></Alert
            >
            <Button
              class="w-full"
              size="lg"
              type="submit"
              :disabled="isSubmitting || isResending || (isVerifyingOtp && !isOtpComplete)"
            >
              <Spinner v-if="isSubmitting" data-icon="inline-start" />
              {{
                isSubmitting
                  ? t('login.pleaseWait')
                  : isVerifyingOtp
                    ? t('login.verifyCode')
                    : isRegistering
                      ? t('login.createAccount')
                      : t('login.logIn')
              }}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter class="flex-col items-stretch">
        <Button
          v-if="!isRegistering && !isVerifyingOtp"
          variant="ghost"
          as-child
          :disabled="isSubmitting"
        >
          <RouterLink
            :to="{ name: 'forgot-password', query: { email: form.email } }"
            :tabindex="isSubmitting ? -1 : undefined"
            :aria-disabled="isSubmitting"
            @click="isSubmitting && $event.preventDefault()"
            >{{ t('passwordReset.forgot') }}</RouterLink
          >
        </Button>
        <Separator />
        <Button
          v-if="isVerifyingOtp"
          variant="outline"
          type="button"
          :disabled="isSubmitting || isResending"
          @click="changeEmail"
          >{{ t('login.useDifferentEmail') }}</Button
        >
        <Button
          v-else
          variant="outline"
          type="button"
          :disabled="isSubmitting"
          @click="toggleMode"
          >{{ isRegistering ? t('login.switchToLogin') : t('login.switchToRegister') }}</Button
        >
      </CardFooter>
    </Card>
  </main>
</template>
