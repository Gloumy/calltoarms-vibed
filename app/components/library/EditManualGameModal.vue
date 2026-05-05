<script setup lang="ts">
interface ManualGame {
  id: string
  name: string
  playtimeTotal: number
  isCompleted: boolean
  completedAt: string | null
  lastPlayed: string | null
  coverUrl: string | null
}

const props = defineProps<{
  open: boolean
  game: ManualGame
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
}>()

const toast = useToast()
const name = ref('')
const playtimeHours = ref<number | undefined>(undefined)
const isCompleted = ref(false)
const completedAt = ref('')
const lastPlayed = ref('')
const coverUrl = ref('')
const loading = ref(false)
const error = ref('')

function isoDateOnly(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

// Hydrate the form whenever the modal opens (or the target game changes).
watch(
  () => [props.open, props.game] as const,
  ([open, game]) => {
    if (!open || !game) return
    name.value = game.name
    playtimeHours.value = game.playtimeTotal > 0
      ? Math.round((game.playtimeTotal / 60) * 10) / 10
      : undefined
    isCompleted.value = game.isCompleted
    completedAt.value = isoDateOnly(game.completedAt)
    lastPlayed.value = isoDateOnly(game.lastPlayed)
    coverUrl.value = game.coverUrl ?? ''
    error.value = ''
  },
  { immediate: true }
)

async function submit() {
  error.value = ''
  if (!name.value.trim()) {
    error.value = 'Nom requis'
    return
  }
  loading.value = true
  try {
    const playtimeMinutes = playtimeHours.value && playtimeHours.value > 0
      ? Math.round(playtimeHours.value * 60)
      : 0
    await $fetch(`/api/library/manual/${props.game.id}`, {
      method: 'PATCH',
      body: {
        name: name.value.trim(),
        playtimeTotal: playtimeMinutes,
        isCompleted: isCompleted.value,
        completedAt: isCompleted.value && completedAt.value ? completedAt.value : null,
        lastPlayed: lastPlayed.value || null,
        coverUrl: coverUrl.value.trim() || null
      }
    })
    toast.add({ title: 'Jeu mis à jour', color: 'success' })
    emit('updated')
    emit('update:open', false)
  } catch (e: unknown) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Erreur lors de la mise à jour'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    :open="props.open"
    @update:open="emit('update:open', $event)"
  >
    <template #header>
      <h3 class="text-lg font-semibold">
        Modifier le jeu
      </h3>
    </template>

    <template #body>
      <form
        class="space-y-4"
        @submit.prevent="submit"
      >
        <UFormField
          label="Nom"
          name="name"
          required
        >
          <UInput
            v-model="name"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Temps de jeu (heures)"
          name="playtime"
        >
          <UInput
            v-model.number="playtimeHours"
            type="number"
            min="0"
            step="0.5"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Dernière session (optionnel)"
          name="lastPlayed"
        >
          <UInput
            v-model="lastPlayed"
            type="date"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="URL de la jaquette (optionnel)"
          name="coverUrl"
        >
          <UInput
            v-model="coverUrl"
            placeholder="https://..."
            class="w-full"
          />
          <div
            v-if="coverUrl.trim()"
            class="mt-2 rounded-md border border-default bg-elevated overflow-hidden"
            :style="{ aspectRatio: '460/215' }"
          >
            <img
              :src="coverUrl"
              alt="Aperçu jaquette"
              class="w-full h-full object-contain"
            >
          </div>
        </UFormField>

        <UFormField name="isCompleted">
          <UCheckbox
            v-model="isCompleted"
            label="Jeu terminé"
          />
        </UFormField>

        <UFormField
          v-if="isCompleted"
          label="Date de complétion (optionnel)"
          name="completedAt"
        >
          <UInput
            v-model="completedAt"
            type="date"
            class="w-full"
          />
        </UFormField>

        <UAlert
          v-if="error"
          color="error"
          :title="error"
          icon="i-lucide-alert-circle"
        />

        <UButton
          type="submit"
          label="Enregistrer"
          icon="i-lucide-save"
          block
          :loading="loading"
        />
      </form>
    </template>
  </UModal>
</template>
