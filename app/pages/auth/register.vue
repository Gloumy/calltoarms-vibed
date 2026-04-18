<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const { register } = useAuth()

const schema = z.object({
  username: z.string().min(3, 'Minimum 3 caractères').max(20, 'Maximum 20 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword']
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const error = ref('')
const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = ''
  loading.value = true
  try {
    await register(event.data.email, event.data.username, event.data.password)
    navigateTo('/')
  } catch (e) {
    error.value = formatAuthError(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-lg font-semibold">
        Créer un compte
      </h2>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Nom d'utilisateur" name="username" required>
        <UInput
          v-model="state.username"
          placeholder="pseudo"
          icon="i-lucide-user"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Email" name="email" required>
        <UInput
          v-model="state.email"
          type="email"
          placeholder="ton@email.com"
          icon="i-lucide-mail"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Mot de passe" name="password" required>
        <PasswordInput v-model="state.password" autocomplete="new-password" />
      </UFormField>

      <UFormField label="Confirmer le mot de passe" name="confirmPassword" required>
        <PasswordInput v-model="state.confirmPassword" autocomplete="new-password" />
      </UFormField>

      <UAlert v-if="error" color="error" :title="error" icon="i-lucide-alert-circle" />

      <UButton
        type="submit"
        label="Créer mon compte"
        icon="i-lucide-user-plus"
        block
        :loading="loading"
      />
    </UForm>

    <template #footer>
      <p class="text-sm text-center">
        Déjà un compte ?
        <NuxtLink to="/auth/login" class="text-violet-500 hover:underline">
          Se connecter
        </NuxtLink>
      </p>
    </template>
  </UCard>
</template>
