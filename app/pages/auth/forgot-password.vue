<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const schema = z.object({
  email: z.string().email('Email invalide')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: ''
})

const success = ref(false)
const error = ref('')
const loading = ref(false)

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  error.value = ''
  loading.value = true
  try {
    // TODO: integrate better-auth forgetPassword when email provider is configured
    success.value = true
  } catch (e: any) {
    error.value = e.message || 'Erreur lors de l\'envoi'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-lg font-semibold">
        Mot de passe oublié
      </h2>
    </template>

    <div v-if="success" class="space-y-4">
      <UAlert
        color="success"
        title="Email envoyé"
        description="Si un compte existe avec cette adresse, tu recevras un lien de réinitialisation."
        icon="i-lucide-check-circle"
      />
      <UButton
        label="Retour à la connexion"
        to="/auth/login"
        variant="outline"
        block
      />
    </div>

    <UForm v-else :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Email" name="email" required>
        <UInput
          v-model="state.email"
          type="email"
          placeholder="ton@email.com"
          icon="i-lucide-mail"
          class="w-full"
        />
      </UFormField>

      <UAlert v-if="error" color="error" :title="error" icon="i-lucide-alert-circle" />

      <UButton
        type="submit"
        label="Envoyer le lien"
        icon="i-lucide-send"
        block
        :loading="loading"
      />
    </UForm>

    <template #footer>
      <p class="text-sm text-center">
        <NuxtLink to="/auth/login" class="text-violet-500 hover:underline">
          Retour à la connexion
        </NuxtLink>
      </p>
    </template>
  </UCard>
</template>
