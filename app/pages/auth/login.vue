<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const { signIn } = useAuth()

const schema = z.object({
  identifier: z.string().min(1, 'Email ou nom d\'utilisateur requis'),
  password: z.string().min(1, 'Mot de passe requis')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  identifier: '',
  password: ''
})

const error = ref('')
const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = ''
  loading.value = true
  try {
    await signIn(event.data.identifier, event.data.password)
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
        Connexion
      </h2>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Email ou nom d'utilisateur" name="identifier" required>
        <UInput
          v-model="state.identifier"
          placeholder="ton@email.com ou pseudo"
          icon="i-lucide-user"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Mot de passe" name="password" required>
        <PasswordInput v-model="state.password" autocomplete="current-password" />
      </UFormField>

      <UAlert v-if="error" color="error" :title="error" icon="i-lucide-alert-circle" />

      <UButton
        type="submit"
        label="Se connecter"
        icon="i-lucide-log-in"
        block
        :loading="loading"
      />
    </UForm>

    <template #footer>
      <div class="text-sm text-center space-y-2">
        <p>
          Pas encore de compte ?
          <NuxtLink to="/auth/register" class="text-violet-500 hover:underline">
            Créer un compte
          </NuxtLink>
        </p>
        <p>
          <NuxtLink to="/auth/forgot-password" class="text-violet-500 hover:underline">
            Mot de passe oublié ?
          </NuxtLink>
        </p>
      </div>
    </template>
  </UCard>
</template>
