<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { forgotPassword, resetPassword } from '../services/authService'
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
import { Field, FieldGroup, FieldLabel, FieldError, Separator } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { PasswordInput } from '../components/ui/password-input'
import { Alert, AlertDescription } from '../components/ui/feedback'
import { Spinner } from '../components/ui/spinner'

const route = useRoute()
const isReset = computed(() => route.name === 'reset-password')
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const password = ref('')
const confirmation = ref('')
const submitting = ref(false)
const completed = ref(false)
const statusKey = ref('')
const errorKey = ref('')
const confirmationInvalid = ref(false)
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const missingLink = computed(() => isReset.value && (!token.value || !email.value))
watch(
  () => route.fullPath,
  () => {
    email.value = typeof route.query.email === 'string' ? route.query.email : ''
    password.value = ''
    confirmation.value = ''
    completed.value = false
    statusKey.value = ''
    errorKey.value = ''
    confirmationInvalid.value = false
  },
)

const submit = async () => {
  if (submitting.value || completed.value || missingLink.value) return
  confirmationInvalid.value = false
  email.value = email.value.trim()
  errorKey.value = ''
  statusKey.value = ''
  if (isReset.value && password.value !== confirmation.value) {
    confirmationInvalid.value = true
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
  <main class="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4 py-10 sm:px-6">
    <Card as="section" class="w-full max-w-md" aria-labelledby="reset-title">
      <CardHeader>
        <CardTitle as="h1" id="reset-title">{{
          t(isReset ? 'passwordReset.resetTitle' : 'passwordReset.forgotTitle')
        }}</CardTitle>
        <CardDescription id="reset-description">{{
          t(isReset ? 'passwordReset.resetHint' : 'passwordReset.hint')
        }}</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex flex-col gap-5">
          <form
            v-if="!completed && !missingLink"
            :aria-busy="submitting"
            aria-describedby="reset-description"
            @submit.prevent="submit"
          >
            <FieldGroup>
              <Field v-if="!isReset" :data-disabled="submitting">
                <FieldLabel for="reset-email">{{ t('login.email') }}</FieldLabel>
                <Input
                  id="reset-email"
                  v-model="email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  :disabled="submitting"
                  :placeholder="t('login.emailPlaceholder')"
                />
              </Field>
              <template v-if="isReset">
                <Field :data-disabled="submitting">
                  <FieldLabel for="reset-password">{{ t('passwordReset.newPassword') }}</FieldLabel>
                  <PasswordInput
                    :key="route.fullPath + 'reset-password'"
                    id="reset-password"
                    :label="t('passwordReset.newPassword')"
                    v-model="password"
                    name="password"
                    autocomplete="new-password"
                    minlength="8"
                    required
                    :disabled="submitting"
                  />
                </Field>
                <Field :data-invalid="confirmationInvalid" :data-disabled="submitting">
                  <FieldLabel for="reset-confirmation">{{ t('login.confirmPassword') }}</FieldLabel>
                  <PasswordInput
                    :key="route.fullPath + 'reset-confirmation'"
                    id="reset-confirmation"
                    :label="t('login.confirmPassword')"
                    v-model="confirmation"
                    name="password_confirmation"
                    autocomplete="new-password"
                    minlength="8"
                    required
                    :disabled="submitting"
                    :aria-invalid="confirmationInvalid"
                    :aria-describedby="confirmationInvalid ? 'reset-confirmation-error' : undefined"
                    @update:model-value="confirmationInvalid = false"
                  />
                  <FieldError v-if="confirmationInvalid" id="reset-confirmation-error">{{
                    t('login.passwordsMismatch')
                  }}</FieldError>
                </Field>
              </template>
              <Button type="submit" size="lg" class="w-full" :disabled="submitting">
                <Spinner v-if="submitting" data-icon="inline-start" />
                {{
                  t(
                    submitting
                      ? 'login.pleaseWait'
                      : isReset
                        ? 'passwordReset.resetButton'
                        : 'passwordReset.sendButton',
                  )
                }}
              </Button>
            </FieldGroup>
          </form>
          <Alert v-if="statusKey" variant="success" role="status"
            ><AlertDescription>{{ t(statusKey) }}</AlertDescription></Alert
          >
          <Alert v-if="errorKey || missingLink" variant="error"
            ><AlertDescription>{{
              t(missingLink ? 'passwordReset.invalid' : errorKey)
            }}</AlertDescription></Alert
          >
        </div>
      </CardContent>
      <CardFooter class="flex-col items-stretch">
        <Button
          v-if="isReset && !completed && (missingLink || errorKey === 'passwordReset.invalid')"
          variant="outline"
          as-child
          :disabled="submitting"
        >
          <RouterLink
            :to="{ name: 'forgot-password', query: { email } }"
            :tabindex="submitting ? -1 : undefined"
            :aria-disabled="submitting"
            @click="submitting && $event.preventDefault()"
            >{{ t('passwordReset.requestNew') }}</RouterLink
          >
        </Button>
        <Separator />
        <Button variant="ghost" as-child :disabled="submitting">
          <RouterLink
            to="/login"
            :tabindex="submitting ? -1 : undefined"
            :aria-disabled="submitting"
            @click="submitting && $event.preventDefault()"
            >{{ t('passwordReset.back') }}</RouterLink
          >
        </Button>
      </CardFooter>
    </Card>
  </main>
</template>
