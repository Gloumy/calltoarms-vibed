<script setup lang="ts">
const props = defineProps<{
  open: boolean
  communityId?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: [sessionId: string]
}>()

const selectedGame = ref<any>(null)
const visibility = ref('friends')
const selectedCommunityId = ref<string | null>(null)
const duration = ref(120)
const maxPlayers = ref<number | undefined>(undefined)
const discussion = ref('')
const loading = ref(false)
const error = ref('')

// Communities for community visibility
const myCommunities = ref<any[]>([])
const loadingCommunities = ref(false)

async function fetchMyCommunities() {
  if (myCommunities.value.length > 0) return
  loadingCommunities.value = true
  try {
    const all = await $fetch<any[]>('/api/communities')
    myCommunities.value = all.filter(c => c.is_member)
  } catch {
    myCommunities.value = []
  } finally {
    loadingCommunities.value = false
  }
}

watch(visibility, (v) => {
  if (v === 'community') fetchMyCommunities()
  else selectedCommunityId.value = null
})

const visibilityOptions = [
  { label: 'Amis', value: 'friends', icon: 'i-lucide-users' },
  { label: 'Communaute', value: 'community', icon: 'i-lucide-globe' },
  { label: 'Public', value: 'public', icon: 'i-lucide-earth' }
]

const durationOptions = [
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
  { label: 'Sans limite', value: 0 }
]

async function createSession() {
  error.value = ''
  loading.value = true
  try {
    const result = await $fetch('/api/sessions', {
      method: 'POST',
      body: {
        gameId: selectedGame.value?.id ?? null,
        visibility: props.communityId ? 'community' : visibility.value,
        communityId: props.communityId ?? selectedCommunityId.value ?? null,
        durationMinutes: duration.value || null,
        maxPlayers: maxPlayers.value || null,
        discussion: discussion.value.trim() || null
      }
    })
    // Reset form
    selectedGame.value = null
    visibility.value = 'friends'
    selectedCommunityId.value = null
    duration.value = 120
    maxPlayers.value = undefined
    discussion.value = ''
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
        Lancer une session
      </h3>
    </template>

    <template #body>
      <form class="space-y-4" @submit.prevent="createSession">
        <!-- Game -->
        <UFormField label="Jeu" name="game">
          <GameSearch v-model="selectedGame" />
        </UFormField>

        <!-- Visibility (hidden when scoped to a community) -->
        <UFormField v-if="!props.communityId" label="Visibilite" name="visibility">
          <div class="flex gap-2">
            <UButton
              v-for="opt in visibilityOptions"
              :key="opt.value"
              :label="opt.label"
              :icon="opt.icon"
              :variant="visibility === opt.value ? 'solid' : 'outline'"
              :color="visibility === opt.value ? 'primary' : 'neutral'"
              size="sm"
              @click="visibility = opt.value"
            />
          </div>
        </UFormField>

        <!-- Community selector (when visibility = community) -->
        <UFormField v-if="!props.communityId && visibility === 'community'" label="Communaute" name="community">
          <div v-if="loadingCommunities" class="text-sm text-muted py-2">
            <UIcon name="i-lucide-loader-2" class="size-4 animate-spin inline-block mr-1" />
            Chargement...
          </div>
          <div v-else-if="myCommunities.length === 0" class="text-sm text-muted py-2">
            Vous n'etes membre d'aucune communaute.
          </div>
          <div v-else class="flex flex-wrap gap-2">
            <UButton
              v-for="c in myCommunities"
              :key="c.id"
              :label="c.name"
              :variant="selectedCommunityId === c.id ? 'solid' : 'outline'"
              :color="selectedCommunityId === c.id ? 'primary' : 'neutral'"
              size="sm"
              @click="selectedCommunityId = c.id"
            />
          </div>
        </UFormField>

        <!-- Duration -->
        <UFormField label="Duree" name="duration">
          <div class="flex gap-2">
            <UButton
              v-for="opt in durationOptions"
              :key="opt.value"
              :label="opt.label"
              :variant="duration === opt.value ? 'solid' : 'outline'"
              :color="duration === opt.value ? 'primary' : 'neutral'"
              size="sm"
              @click="duration = opt.value"
            />
          </div>
        </UFormField>

        <!-- Max players -->
        <UFormField label="Joueurs max (optionnel)" name="maxPlayers">
          <UInput
            v-model.number="maxPlayers"
            type="number"
            :min="2"
            :max="100"
            placeholder="Pas de limite"
            class="w-full"
          />
        </UFormField>

        <!-- Discussion -->
        <UFormField label="Info discussion (optionnel)" name="discussion">
          <UInput
            v-model="discussion"
            placeholder="Discord #channel, IP serveur..."
            icon="i-lucide-message-circle"
            class="w-full"
          />
        </UFormField>

        <UAlert v-if="error" color="error" :title="error" icon="i-lucide-alert-circle" />

        <UButton
          type="submit"
          label="Lancer la session"
          icon="i-lucide-rocket"
          block
          :loading="loading"
        />
      </form>
    </template>
  </UModal>
</template>
