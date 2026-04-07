<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  sent: []
}>()

const username = ref('')
const error = ref('')
const loading = ref(false)

async function sendRequest() {
  if (!username.value.trim()) return

  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/friends/request', {
      method: 'POST',
      body: { username: username.value.trim() }
    })
    username.value = ''
    emit('update:open', false)
    emit('sent')
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Erreur lors de l\'envoi'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal :open="props.open" @update:open="emit('update:open', $event)">
    <template #header>
      <h3 class="text-lg font-semibold">
        Ajouter un ami
      </h3>
    </template>

    <template #body>
      <form class="space-y-4" @submit.prevent="sendRequest">
        <UFormField label="Nom d'utilisateur" name="username">
          <UInput
            v-model="username"
            placeholder="Entrer un pseudo"
            icon="i-lucide-user-plus"
            class="w-full"
            autofocus
          />
        </UFormField>

        <UAlert v-if="error" color="error" :title="error" icon="i-lucide-alert-circle" />

        <UButton
          type="submit"
          label="Envoyer la demande"
          icon="i-lucide-send"
          block
          :loading="loading"
          :disabled="!username.trim()"
        />
      </form>
    </template>
  </UModal>
</template>
