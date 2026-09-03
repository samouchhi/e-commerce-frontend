<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login, register } from '../services/authService'

const route = useRoute()
const router = useRouter()
const isRegistering = ref(route.query.mode === 'register')
const isSubmitting = ref(false)
const errorMessage = ref('')
const form = ref({ email: '', password: '', password_confirmation: '' })

const apiError = (error) => {
  const messages = error.details?.errors
  if (messages) return Object.values(messages).flat().join(' ')
  return error.details?.message || 'Something went wrong. Please try again.'
}

const submit = async () => {
  errorMessage.value = ''
  if (isRegistering.value && form.value.password !== form.value.password_confirmation) {
    errorMessage.value = 'Passwords do not match.'
    return
  }
  isSubmitting.value = true
  try {
    if (isRegistering.value) {
      await register({
        email: form.value.email,
        password: form.value.password,
        password_confirmation: form.value.password_confirmation,
      })
    } else {
      await login({ email: form.value.email, password: form.value.password })
    }
    router.push(route.query.redirect || '/checkout')
  } catch (error) {
    errorMessage.value = apiError(error)
  } finally {
    isSubmitting.value = false
  }
}

const toggleMode = () => {
  isRegistering.value = !isRegistering.value
  errorMessage.value = ''
  form.value.password_confirmation = ''
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-panel" aria-labelledby="auth-title">
      <p class="eyebrow">ZANDO account</p>
      <h1 id="auth-title">{{ isRegistering ? 'Create your account.' : 'Welcome back.' }}</h1>
      <p class="auth-panel__intro">
        {{
          isRegistering
            ? 'Save your details for a smoother checkout.'
            : 'Sign in to continue to checkout.'
        }}
      </p>

      <form class="auth-form" @submit.prevent="submit">
        <label>
          Email
          <input v-model.trim="form.email" required type="email" autocomplete="email" />
        </label>
        <label>
          Password
          <input
            v-model="form.password"
            required
            type="password"
            :autocomplete="isRegistering ? 'new-password' : 'current-password'"
            minlength="8"
          />
        </label>
        <label v-if="isRegistering">
          Confirm password
          <input
            v-model="form.password_confirmation"
            required
            type="password"
            autocomplete="new-password"
            minlength="8"
          />
        </label>
        <p v-if="errorMessage" class="auth-error" role="alert">{{ errorMessage }}</p>
        <button class="checkout-button" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Please wait...' : isRegistering ? 'Create account' : 'Log in' }}
        </button>
      </form>

      <button class="auth-toggle" type="button" @click="toggleMode">
        {{ isRegistering ? 'Already have an account? Log in' : 'New here? Create an account' }}
      </button>
    </section>
  </main>
</template>
