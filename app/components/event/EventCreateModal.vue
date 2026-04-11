<script setup lang="ts">
const props = defineProps<{
  open: boolean
  communityId?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: [eventId: string]
}>()

const title = ref('')
const description = ref('')
const selectedGame = ref<any>(null)
const visibility = ref('friends')
const scheduledAt = ref('')
const discussion = ref('')
const loading = ref(false)
const error = ref('')

// Invite system
const friends = ref<any[]>([])
const selectedFriendIds = ref<Set<string>>(new Set())
const loadingFriends = ref(false)

async function fetchFriends() {
  if (friends.value.length > 0) return
  loadingFriends.value = true
  try {
    friends.value = await $fetch<any[]>('/api/friends')
  } catch {
    friends.value = []
  } finally {
    loadingFriends.value = false
  }
}

function toggleFriend(id: string) {
  const s = new Set(selectedFriendIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedFriendIds.value = s
}

function selectAllFriends() {
  selectedFriendIds.value = new Set(friends.value.map(f => f.id))
}

function deselectAllFriends() {
  selectedFriendIds.value = new Set()
}

watch(visibility, (v) => {
  if (v === 'invite_only') fetchFriends()
})

const visibilityOptions = [
  { label: 'Amis', value: 'friends', icon: 'i-lucide-users' },
  { label: 'Communaute', value: 'community', icon: 'i-lucide-globe' },
  { label: 'Public', value: 'public', icon: 'i-lucide-earth' },
  { label: 'Sur invitation', value: 'invite_only', icon: 'i-lucide-lock' }
]

// Default to tomorrow at 20:00
onMounted(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(20, 0, 0, 0)
  scheduledAt.value = tomorrow.toISOString().slice(0, 16)
})

async function createEvent() {
  if (!title.value.trim()) return
  error.value = ''
  loading.value = true
  try {
    const result = await $fetch<any>('/api/events', {
      method: 'POST',
      body: {
        title: title.value.trim(),
        description: description.value.trim() || null,
        gameId: selectedGame.value?.id ?? null,
        visibility: props.communityId ? 'community' : visibility.value,
        communityId: props.communityId ?? null,
        scheduledAt: new Date(scheduledAt.value).toISOString(),
        discussion: discussion.value.trim() || null,
        invitedUserIds: visibility.value === 'invite_only' ? [...selectedFriendIds.value] : undefined
      }
    })
    // Reset
    title.value = ''
    description.value = ''
    selectedGame.value = null
    visibility.value = 'friends'
    discussion.value = ''
    selectedFriendIds.value = new Set()
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
        Creer un evenement
      </h3>
    </template>

    <template #body>
      <form class="space-y-4" @submit.prevent="createEvent">
        <!-- Title -->
        <UFormField label="Titre" name="title">
          <UInput
            v-model="title"
            placeholder="Soiree ranked, tournoi..."
            class="w-full"
            autofocus
          />
        </UFormField>

        <!-- Description -->
        <UFormField label="Description (optionnel)" name="description">
          <UTextarea
            v-model="description"
            placeholder="Details de l'evenement..."
            class="w-full"
            :rows="2"
          />
        </UFormField>

        <!-- Game -->
        <UFormField label="Jeu (optionnel)" name="game">
          <GameSearch v-model="selectedGame" />
        </UFormField>

        <!-- Date / time -->
        <UFormField label="Date et heure" name="scheduledAt">
          <UInput
            v-model="scheduledAt"
            type="datetime-local"
            class="w-full"
          />
        </UFormField>

        <!-- Visibility (hidden when scoped to a community) -->
        <UFormField v-if="!props.communityId" label="Visibilite" name="visibility">
          <div class="flex flex-wrap gap-2">
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

        <!-- Friend picker (invite_only) -->
        <div v-if="visibility === 'invite_only'">
          <UFormField label="Inviter des amis" name="invites">
            <div v-if="loadingFriends" class="flex items-center gap-2 py-2 text-sm text-muted">
              <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
              Chargement...
            </div>
            <div v-else-if="friends.length === 0" class="text-sm text-muted py-2">
              Aucun ami a inviter.
            </div>
            <template v-else>
              <div class="flex gap-2 mb-2">
                <UButton label="Tous" variant="ghost" color="neutral" size="xs" @click="selectAllFriends" />
                <UButton label="Aucun" variant="ghost" color="neutral" size="xs" @click="deselectAllFriends" />
                <span class="text-xs text-muted self-center ml-auto">{{ selectedFriendIds.size }} selectionne{{ selectedFriendIds.size > 1 ? 's' : '' }}</span>
              </div>
              <div class="max-h-40 overflow-y-auto space-y-1 rounded-md border border-default p-2">
                <button
                  v-for="f in friends"
                  :key="f.id"
                  type="button"
                  class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors"
                  :class="selectedFriendIds.has(f.id) ? 'bg-violet-500/10 text-violet-500' : 'hover:bg-elevated'"
                  @click="toggleFriend(f.id)"
                >
                  <UAvatar :src="f.image ?? undefined" :alt="f.username" size="2xs" />
                  <span class="flex-1 text-left truncate">{{ f.username }}</span>
                  <UIcon
                    :name="selectedFriendIds.has(f.id) ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                    class="size-4 shrink-0"
                  />
                </button>
              </div>
            </template>
          </UFormField>
        </div>

        <!-- Discussion -->
        <UFormField label="Info discussion (optionnel)" name="discussion">
          <UInput
            v-model="discussion"
            placeholder="Discord #channel, lien vocal..."
            icon="i-lucide-message-circle"
            class="w-full"
          />
        </UFormField>

        <UAlert v-if="error" color="error" :title="error" icon="i-lucide-alert-circle" />

        <UButton
          type="submit"
          label="Creer l'evenement"
          icon="i-lucide-calendar-plus"
          block
          :loading="loading"
          :disabled="!title.trim() || !scheduledAt"
        />
      </form>
    </template>
  </UModal>
</template>
