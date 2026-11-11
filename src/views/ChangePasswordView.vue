<script setup>
import StoreIcon from '../components/icons/StoreIcon.vue'
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { changePassword, validateSession } from '../services/authService'
import { t } from '../services/i18n'
import { validationErrors, validationMessage } from '../utils/apiErrors'
import { Button } from '../components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/card'
import { Field, FieldGroup, FieldLabel, FieldError } from '../components/ui/field'
import { PasswordInput } from '../components/ui/password-input'
import { Alert, AlertDescription, Skeleton } from '../components/ui/feedback'
import { Spinner } from '../components/ui/spinner'

const router = useRouter()
const sessionState = ref('checking')
const current = ref('')
const password = ref('')
const confirmation = ref('')
const submitting = ref(false)
const completed = ref(false)
const errors = ref({})
const errorKey = ref('')
const errorMessage = ref('')
let unmounted = false
let checking = false
const fields = [
  { key: 'current_password', id: 'change-current', label: 'changePassword.current' },
  { key: 'password', id: 'change-new', label: 'passwordReset.newPassword' },
  { key: 'password_confirmation', id: 'change-confirm', label: 'login.confirmPassword' },
]
const checkSession = async () => {
  if (checking) return
  checking = true
  sessionState.value = 'checking'
  try {
    await validateSession()
    if (!unmounted) sessionState.value = 'ready'
  } catch (error) {
    if (unmounted) return
    if ([401, 403].includes(error.status))
      router.replace({ name: 'login', query: { redirect: '/change-password' } })
    else sessionState.value = 'unavailable'
  } finally {
    checking = false
  }
}
const focusError = async () => {
  await nextTick()
  document.getElementById(fields.find((field) => errors.value[field.key])?.id)?.focus()
}
const submit = async () => {
  if (submitting.value || completed.value || sessionState.value !== 'ready') return
  errors.value = {}
  errorKey.value = ''
  errorMessage.value = ''
  if (!current.value) errors.value.current_password = t('changePassword.required')
  if ([...password.value].length < 8) errors.value.password = t('changePassword.tooShort')
  if (new TextEncoder().encode(password.value).length > 72 || password.value.includes('\0'))
    errors.value.password = t('changePassword.tooLong')
  if (password.value === current.value) errors.value.password = t('changePassword.different')
  if (password.value !== confirmation.value)
    errors.value.password_confirmation = t('login.passwordsMismatch')
  if (Object.keys(errors.value).length) {
    await focusError()
    return
  }
  submitting.value = true
  try {
    await changePassword({
      current_password: current.value,
      password: password.value,
      password_confirmation: confirmation.value,
    })
    if (!unmounted) completed.value = true
    current.value = password.value = confirmation.value = ''
  } catch (error) {
    if (unmounted) return
    if (error.status === 401) {
      current.value = password.value = confirmation.value = ''
      router.replace({ name: 'login', query: { redirect: '/change-password' } })
    } else if (error.status === 422) {
      const serverErrors = validationErrors(error)
      for (const field of fields) {
        if (serverErrors[field.key]) errors.value[field.key] = serverErrors[field.key]
      }
      errorMessage.value = validationMessage(error, t('login.genericError'))
      await focusError()
    } else {
      errorKey.value = error.status === 429 ? 'passwordReset.tooMany' : 'login.genericError'
    }
  } finally {
    submitting.value = false
  }
}
onMounted(checkSession)
onUnmounted(() => {
  unmounted = true
  current.value = password.value = confirmation.value = ''
})
</script>

<template>
  <main id="main-content" tabindex="-1" class="store-auth-page">
    <Card as="section" class="store-auth-card" aria-labelledby="change-title">
      <CardHeader>
        <div class="mb-3 flex items-center justify-between">
          <Button as-child variant="ghost" size="icon"
            ><RouterLink
              to="/orders"
              :aria-label="t('profile.myOrders')"
              :title="t('profile.myOrders')"
              ><StoreIcon name="back" /></RouterLink
          ></Button>
        </div>
        <CardTitle as="h1" id="change-title">{{ t('changePassword.title') }}</CardTitle>
        <CardDescription id="change-description">{{ t('changePassword.hint') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          v-if="sessionState === 'checking'"
          role="status"
          :aria-label="t('session.checking')"
          class="grid gap-5"
        >
          <span class="sr-only">{{ t('session.checking') }}</span>
          <Skeleton v-for="n in 3" :key="n" class="h-14 w-full" />
        </div>
        <div v-else-if="sessionState === 'unavailable'" class="grid gap-4">
          <Alert variant="error"
            ><AlertDescription>{{ t('session.retryHelp') }}</AlertDescription></Alert
          >
          <Button type="button" variant="outline" @click="checkSession">{{
            t('checkout.retryAddresses')
          }}</Button>
        </div>
        <Alert v-else-if="completed" variant="success" role="status">
          <AlertDescription>{{ t('changePassword.success') }}</AlertDescription>
        </Alert>
        <form
          v-else
          novalidate
          :aria-busy="submitting"
          aria-describedby="change-description"
          @submit.prevent="submit"
        >
          <FieldGroup>
            <Field :data-invalid="Boolean(errors.current_password)" :data-disabled="submitting">
              <FieldLabel for="change-current">{{ t('changePassword.current') }}</FieldLabel>
              <PasswordInput
                id="change-current"
                v-model="current"
                :label="t('changePassword.current')"
                autocomplete="current-password"
                required
                :disabled="submitting"
                :aria-invalid="Boolean(errors.current_password)"
                :aria-describedby="errors.current_password ? 'change-current-error' : undefined"
                @update:model-value="delete errors.current_password"
              />
              <FieldError v-if="errors.current_password" id="change-current-error">{{
                errors.current_password
              }}</FieldError>
            </Field>
            <Field :data-invalid="Boolean(errors.password)" :data-disabled="submitting">
              <FieldLabel for="change-new">{{ t('passwordReset.newPassword') }}</FieldLabel>
              <PasswordInput
                id="change-new"
                v-model="password"
                :label="t('passwordReset.newPassword')"
                autocomplete="new-password"
                required
                minlength="8"
                :disabled="submitting"
                :aria-invalid="Boolean(errors.password)"
                :aria-describedby="errors.password ? 'change-new-error' : undefined"
                @update:model-value="delete errors.password"
              />
              <FieldError v-if="errors.password" id="change-new-error">{{
                errors.password
              }}</FieldError>
            </Field>
            <Field
              :data-invalid="Boolean(errors.password_confirmation)"
              :data-disabled="submitting"
            >
              <FieldLabel for="change-confirm">{{ t('login.confirmPassword') }}</FieldLabel>
              <PasswordInput
                id="change-confirm"
                v-model="confirmation"
                :label="t('login.confirmPassword')"
                autocomplete="new-password"
                required
                :disabled="submitting"
                :aria-invalid="Boolean(errors.password_confirmation)"
                :aria-describedby="
                  errors.password_confirmation ? 'change-confirm-error' : undefined
                "
                @update:model-value="delete errors.password_confirmation"
              />
              <FieldError v-if="errors.password_confirmation" id="change-confirm-error">{{
                errors.password_confirmation
              }}</FieldError>
            </Field>
            <Alert v-if="errorMessage || errorKey" variant="error"
              ><AlertDescription>{{ errorMessage || t(errorKey) }}</AlertDescription></Alert
            >
            <Button type="submit" :disabled="submitting">
              <Spinner v-if="submitting" data-icon="inline-start" />
              <StoreIcon v-else name="check" />
              {{ t(submitting ? 'changePassword.saving' : 'changePassword.title') }}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter v-if="completed">
        <Button as-child variant="link"
          ><RouterLink to="/login">{{ t('profile.logIn') }}</RouterLink></Button
        >
      </CardFooter>
    </Card>
  </main>
</template>
