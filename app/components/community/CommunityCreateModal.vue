<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: [id: string]
}>()

const name = ref('')
const description = ref('')
const selectedGame = ref<any>(null)
const isPublic = ref(true)
const loading = ref(false)
const error = ref('')

async function createCommunity() {
  if (!name.value.trim()) return
  error.value = ''
  loading.value = true
  try {
    const result = await $fetch<any>('/api/communities', {
      method: 'POST',
      body: {
        name: name.value.trim(),
        description: description.value.trim() || null,
        gameId: selectedGame.value?.id ?? null,
        isPublic: isPublic.value
      }
    })
    name.value = ''
    description.value = ''
    selectedGame.value = null
    isPublic.value = true
    emit('update:open', false)
    emit('created', result.id)
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Erreur lors de la creation'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal :open="props.open" @update:open="emit('update:open', $event)">
    <template #header>
      <h3 class="text-lg font-semibold">
        Creer une communaute
      </h3>
    </template>

    <template #body>
      <form class="space-y-4" @submit.prevent="createCommunity">
        <UFormField label="Nom" name="name">
          <UInput
            v-model="name"
            placeholder="Ma communaute..."
            class="w-full"
            autofocus
          />
        </UFormField>

        <UFormField label="Description (optionnel)" name="description">
          <UTextarea
            v-model="description"
            placeholder="De quoi parle cette communaute..."
            class="w-full"
            :rows="2"
          />
        </UFormField>

        <UFormField label="Jeu associe (optionnel)" name="game">
          <GameSearch v-model="selectedGame" />
        </UFormField>

        <UFormField label="Visibilite" name="visibility">
          <div class="flex gap-2">
            <UButton
              label="Publique"
              icon="i-lucide-earth"
              :variant="isPublic ? 'solid' : 'outline'"
              :color="isPublic ? 'primary' : 'neutral'"
              size="sm"
              @click="isPublic = true"
            />
            <UButton
              label="Privee"
              icon="i-lucide-lock"
              :variant="!isPublic ? 'solid' : 'outline'"
              :color="!isPublic ? 'primary' : 'neutral'"
              size="sm"
              @click="isPublic = false"
            />
          </div>
        </UFormField>

        <UAlert v-if="error" color="error" :title="error" icon="i-lucide-alert-circle" />

        <UButton
          type="submit"
          label="Creer la communaute"
          icon="i-lucide-users"
          block
          :loading="loading"
          :disabled="!name.trim()"
        />
      </form>
    </template>
  </UModal>
</template>
