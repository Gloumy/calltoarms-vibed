<script setup lang="ts">
const props = defineProps<{
  session: {
    id: string
    created_by: string
    game_id: number | null
    community_id: string | null
    visibility: string
    status: string
    max_players: number | null
    expires_at: string
    discussion: string | null
    created_at: string
    creator_name: string
    creator_avatar: string | null
    game_name: string | null
    game_cover_url: string | null
    community_name: string | null
    current_players: number
    is_friend: boolean
    has_joined: boolean
  }
}>()

const emit = defineEmits<{
  join: [sessionId: string]
  refresh: []
}>()

const { user } = useAuth()
const joining = ref(false)

const sessionStatus = computed(() => {
  const now = new Date()
  const expiresAt = new Date(props.session.expires_at)
  const minutesLeft = (expiresAt.getTime() - now.getTime()) / 60000

  if (minutesLeft < 15) return 'expires_soon'
  if (props.session.max_players && props.session.current_players >= props.session.max_players) return 'full'
  return 'open'
})

const timeLeft = computed(() => {
  const now = new Date()
  const expiresAt = new Date(props.session.expires_at)
  const minutes = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 60000))
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours > 0) return `${hours}h${mins > 0 ? `${String(mins).padStart(2, '0')}` : ''}`
  return `${mins}min`
})

const playersLabel = computed(() => {
  const { current_players, max_players } = props.session
  return max_players
    ? `${current_players} / ${max_players}`
    : `${current_players} joueur${current_players > 1 ? 's' : ''}`
})

const isOwner = computed(() => user.value?.id === props.session.created_by)
const canJoin = computed(() =>
  !isOwner.value
  && !props.session.has_joined
  && sessionStatus.value !== 'full'
)

async function joinSession() {
  joining.value = true
  try {
    await $fetch(`/api/sessions/${props.session.id}/join`, { method: 'POST' })
    emit('join', props.session.id)
    emit('refresh')
  } catch {
    // handled silently
  } finally {
    joining.value = false
  }
}
</script>

<template>
  <div class="rounded-lg border border-default bg-default p-4 border-l-2 border-l-violet-500">
    <div class="flex gap-3">
      <!-- Game thumbnail -->
      <img
        v-if="session.game_cover_url"
        :src="session.game_cover_url"
        :alt="session.game_name ?? ''"
        class="w-12 h-16 rounded object-cover shrink-0"
      >
      <div
        v-else-if="session.game_name"
        class="w-12 h-16 rounded bg-violet-500/20 text-violet-500 flex items-center justify-center text-lg font-bold shrink-0"
      >
        {{ session.game_name.charAt(0) }}
      </div>
      <div
        v-else
        class="w-12 h-16 rounded bg-violet-500/20 text-violet-500 flex items-center justify-center shrink-0"
      >
        <UIcon name="i-lucide-gamepad-2" class="size-5" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="text-sm font-semibold truncate">
            {{ session.game_name || 'Session libre' }}
          </h3>

          <!-- Status badges -->
          <UBadge
            v-if="sessionStatus === 'full'"
            color="error"
            variant="subtle"
            size="xs"
          >
            Complet
          </UBadge>
          <UBadge
            v-else-if="sessionStatus === 'expires_soon'"
            color="warning"
            variant="subtle"
            size="xs"
          >
            Expire bientot
          </UBadge>
        </div>

        <!-- Creator + time -->
        <p class="text-xs text-muted mb-2">
          <span class="inline-flex items-center gap-1">
            <UAvatar :src="session.creator_avatar ?? undefined" :alt="session.creator_name" size="3xs" />
            {{ session.creator_name }}
          </span>
          <span class="mx-1">&middot;</span>
          <span>{{ timeLeft }} restantes</span>
          <span v-if="session.community_name" class="mx-1">&middot;</span>
          <span v-if="session.community_name" class="text-violet-500">via {{ session.community_name }}</span>
        </p>

        <!-- Players + join -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">
            <UIcon name="i-lucide-users" class="size-3.5 inline-block mr-1" />
            {{ playersLabel }}
          </span>

          <div class="flex gap-2">
            <UButton
              v-if="session.discussion"
              icon="i-lucide-message-circle"
              variant="ghost"
              color="neutral"
              size="xs"
              :title="session.discussion"
            />
            <UButton
              v-if="canJoin"
              label="Rejoindre"
              icon="i-lucide-log-in"
              size="xs"
              :loading="joining"
              @click="joinSession"
            />
            <UBadge
              v-else-if="session.has_joined && !isOwner"
              color="primary"
              variant="subtle"
              size="xs"
            >
              Rejoint
            </UBadge>
            <UBadge
              v-else-if="isOwner"
              color="neutral"
              variant="subtle"
              size="xs"
            >
              Ma session
            </UBadge>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
