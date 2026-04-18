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
const leaving = ref(false)
const showSwitchConfirm = ref(false)
const switchFromSession = ref<{ id: string; gameName: string | null } | null>(null)
const showLeaveConfirm = ref(false)
const leaveInfo = ref<{ hasOthers: boolean; nextLeader: { id: string; username: string } | null } | null>(null)

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

async function joinSession(force = false) {
  joining.value = true
  try {
    await $fetch(`/api/sessions/${props.session.id}/join`, {
      method: 'POST',
      body: force ? { force: true } : {}
    })
    emit('join', props.session.id)
    emit('refresh')
  } catch (e: any) {
    // Already in another session — show confirmation
    if (e.data?.data?.code === 'ALREADY_IN_SESSION') {
      switchFromSession.value = {
        id: e.data.data.currentSessionId,
        gameName: e.data.data.currentSessionGameName
      }
      showSwitchConfirm.value = true
      return
    }
  } finally {
    joining.value = false
  }
}

async function confirmSwitch() {
  showSwitchConfirm.value = false
  switchFromSession.value = null
  await joinSession(true)
}

async function leaveSession(confirm = false) {
  leaving.value = true
  try {
    const result = await $fetch<any>(`/api/sessions/${props.session.id}/leave`, {
      method: 'POST',
      body: confirm ? { confirm: true } : {}
    })

    // Server asks for confirmation (creator leaving)
    if (result.needsConfirm) {
      leaveInfo.value = {
        hasOthers: result.hasOthers,
        nextLeader: result.nextLeader
      }
      showLeaveConfirm.value = true
      return
    }

    emit('refresh')
  } catch {
    // handled silently
  } finally {
    leaving.value = false
  }
}

async function confirmLeave() {
  showLeaveConfirm.value = false
  leaveInfo.value = null
  await leaveSession(true)
}
</script>

<template>
  <div class="h-full rounded-lg border border-default bg-default overflow-hidden border-l-2 border-l-violet-500">
    <div class="flex h-full">
      <!-- Game thumbnail — full bleed -->
      <img
        v-if="session.game_cover_url"
        :src="session.game_cover_url"
        :alt="session.game_name ?? ''"
        class="w-16 object-cover shrink-0"
      >
      <div
        v-else-if="session.game_name"
        class="w-16 bg-violet-500/20 text-violet-500 flex items-center justify-center text-lg font-bold shrink-0"
      >
        {{ session.game_name.charAt(0) }}
      </div>
      <div
        v-else
        class="w-16 bg-violet-500/20 text-violet-500 flex items-center justify-center shrink-0"
      >
        <UIcon name="i-lucide-gamepad-2" class="size-5" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0 p-4">
        <div class="flex items-center gap-2 mb-1">
          <NuxtLink :to="`/sessions/${session.id}`" class="text-base font-semibold truncate hover:underline">
            {{ session.game_name || 'Session libre' }}
          </NuxtLink>

          <!-- Status badges -->
          <UBadge
            v-if="sessionStatus === 'full'"
            color="error"
            variant="subtle"
            size="sm"
          >
            Complet
          </UBadge>
          <UBadge
            v-else-if="sessionStatus === 'expires_soon'"
            color="warning"
            variant="subtle"
            size="sm"
          >
            Expire bientot
          </UBadge>
        </div>

        <!-- Creator + time -->
        <p class="text-sm text-muted mb-2">
          <UserPopover :user-id="session.created_by" :name="session.creator_name" :avatar="session.creator_avatar" />
          <span class="mx-1">&middot;</span>
          <span>{{ timeLeft }} restantes</span>
          <span v-if="session.community_name" class="mx-1">&middot;</span>
          <span v-if="session.community_name" class="text-violet-500">via {{ session.community_name }}</span>
        </p>

        <!-- Players + join -->
        <div class="flex items-center justify-between">
          <span class="text-sm text-muted">
            <UIcon name="i-lucide-users" class="size-4 inline-block mr-1" />
            {{ playersLabel }}
          </span>

          <div class="flex gap-2">
            <UButton
              icon="i-lucide-eye"
              variant="ghost"
              color="neutral"
              size="xs"
              :to="`/sessions/${session.id}`"
              title="Voir la session"
            />
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
            <UButton
              v-else-if="session.has_joined && !isOwner"
              label="Quitter"
              icon="i-lucide-log-out"
              variant="outline"
              color="error"
              size="xs"
              :loading="leaving"
              @click="leaveSession"
            />
            <UButton
              v-else-if="isOwner"
              label="Quitter"
              icon="i-lucide-log-out"
              variant="outline"
              color="error"
              size="xs"
              :loading="leaving"
              @click="leaveSession()"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- Switch session confirmation -->
    <UModal :open="showSwitchConfirm" @update:open="showSwitchConfirm = $event">
      <template #header>
        <h3 class="text-lg font-semibold">
          Changer de session
        </h3>
      </template>

      <template #body>
        <p class="text-sm mb-4">
          Tu es deja dans une session<span v-if="switchFromSession?.gameName"> ({{ switchFromSession.gameName }})</span>.
          Veux-tu la quitter pour rejoindre celle-ci ?
        </p>
        <div class="flex gap-2 justify-end">
          <UButton
            label="Annuler"
            variant="outline"
            color="neutral"
            size="sm"
            @click="showSwitchConfirm = false"
          />
          <UButton
            label="Quitter et rejoindre"
            icon="i-lucide-arrow-right-left"
            size="sm"
            @click="confirmSwitch"
          />
        </div>
      </template>
    </UModal>

    <!-- Owner leave confirmation -->
    <UModal :open="showLeaveConfirm" @update:open="showLeaveConfirm = $event">
      <template #header>
        <h3 class="text-lg font-semibold">
          Quitter ta session
        </h3>
      </template>

      <template #body>
        <p v-if="leaveInfo?.hasOthers" class="text-sm mb-4">
          Le lead sera transfere a <strong>{{ leaveInfo.nextLeader?.username }}</strong>.
          Tu veux continuer ?
        </p>
        <p v-else class="text-sm mb-4">
          Il n'y a aucun autre joueur. La session sera fermee.
          Tu veux continuer ?
        </p>
        <div class="flex gap-2 justify-end">
          <UButton
            label="Annuler"
            variant="outline"
            color="neutral"
            size="sm"
            @click="showLeaveConfirm = false"
          />
          <UButton
            :label="leaveInfo?.hasOthers ? 'Transferer et quitter' : 'Fermer la session'"
            :icon="leaveInfo?.hasOthers ? 'i-lucide-arrow-right-left' : 'i-lucide-x'"
            color="error"
            size="sm"
            @click="confirmLeave"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
