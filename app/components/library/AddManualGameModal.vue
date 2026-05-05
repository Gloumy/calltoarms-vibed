<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'created': [id: string]
}>()

interface IgdbGame {
  id: number
  name: string
  coverUrl?: string | null
}

const toast = useToast()
const selectedGame = ref<IgdbGame | null>(null)
const name = ref('')
const coverUrl = ref('')
const playtimeHours = ref<number | undefined>(undefined)
const isCompleted = ref(false)
const completedAt = ref('')
const lastPlayed = ref('')
const loading = ref(false)
const error = ref('')

// Pre-fill name + cover from the IGDB pick. Both stay editable so the user can
// drop in a nicer banner (e.g. SteamGridDB) than the default IGDB poster.
watch(selectedGame, (game) => {
  if (!game) return
  if (!name.value.trim()) name.value = game.name
  if (!coverUrl.value.trim() && game.coverUrl) coverUrl.value = game.coverUrl
})

function reset() {
  selectedGame.value = null
  name.value = ''
  coverUrl.value = ''
  playtimeHours.value = undefined
  isCompleted.value = false
  completedAt.value = ''
  lastPlayed.value = ''
  error.value = ''
}

watch(() => props.open, (open) => {
  if (!open) reset()
})

async function submit() {
  error.value = ''
  const trimmedName = name.value.trim()
  if (!trimmedName && !selectedGame.value) {
    error.value = 'Choisis un jeu ou saisis un nom'
    return
  }

  loading.value = true
  try {
    const playtimeMinutes = playtimeHours.value && playtimeHours.value > 0
      ? Math.round(playtimeHours.value * 60)
      : 0

    const trimmedCover = coverUrl.value.trim()
    const result = await $fetch<{ success: boolean, id: string }>('/api/library/manual', {
      method: 'POST',
      body: {
        gameId: selectedGame.value?.id,
        name: trimmedName || undefined,
        coverUrl: trimmedCover || undefined,
        iconUrl: trimmedCover || undefined,
        playtimeTotal: playtimeMinutes,
        isCompleted: isCompleted.value,
        completedAt: isCompleted.value && completedAt.value ? completedAt.value : null,
        lastPlayed: lastPlayed.value || null
      }
    })
    toast.add({ title: 'Jeu ajouté', color: 'success' })
    emit('created', result.id)
    emit('update:open', false)
  } catch (e: unknown) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Erreur lors de l\'ajout'
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
        Ajouter un jeu
      </h3>
    </template>

    <template #body>
      <form
        class="space-y-4"
        @submit.prevent="submit"
      >
        <UFormField
          label="Rechercher dans IGDB (optionnel)"
          name="game"
          help="Pour récupérer le titre et la jaquette automatiquement."
        >
          <GameSearch v-model="selectedGame" />
        </UFormField>

        <UFormField
          label="Nom"
          name="name"
          required
        >
          <UInput
            v-model="name"
            placeholder="Ex. The Legend of Zelda: Minish Cap"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="URL de la jaquette (optionnel)"
          name="coverUrl"
          help="Pré-remplie depuis IGDB si tu sélectionnes un jeu. Tu peux coller une autre URL (SteamGridDB, etc.)."
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

        <UFormField
          label="Temps de jeu (heures)"
          name="playtime"
        >
          <UInput
            v-model.number="playtimeHours"
            type="number"
            min="0"
            step="0.5"
            placeholder="0"
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
          label="Ajouter le jeu"
          icon="i-lucide-plus"
          block
          :loading="loading"
        />
      </form>
    </template>
  </UModal>
</template>
