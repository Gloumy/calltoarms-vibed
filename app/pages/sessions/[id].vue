<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const route = useRoute()
const { user } = useAuth()
const { on } = useWebSocket()
const sessionId = route.params.id as string

const sessionData = ref<any>(null)
const loading = ref(true)
const messages = ref<any[]>([])
const newMessage = ref('')
const postingMessage = ref(false)
const chatContainer = ref<HTMLElement | null>(null)
const joining = ref(false)
const leaving = ref(false)
const showSwitchConfirm = ref(false)
const switchFromSession = ref<{ id: string, gameName: string | null } | null>(null)
const showLeaveConfirm = ref(false)
const leaveInfo = ref<{ hasOthers: boolean, nextLeader: { id: string, username: string } | null } | null>(null)

async function fetchSession() {
  try {
    sessionData.value = await $fetch(`/api/sessions/${sessionId}`)
  } catch {
    sessionData.value = null
  } finally {
    loading.value = false
  }
}

async function fetchMessages() {
  try {
    messages.value = await $fetch(`/api/sessions/${sessionId}/messages`)
    await nextTick()
    scrollToBottom()
  } catch {
    // silently ignore
  }
}

// ─── Computed ─────────────────────────────────────────

const isOwner = computed(() => user.value?.id === sessionData.value?.created_by)

const hasJoined = computed(() =>
  sessionData.value?.participants?.some((p: any) => p.userId === user.value?.id)
)

const sessionStatus = computed(() => {
  if (!sessionData.value) return 'open'
  const now = new Date()
  const expiresAt = new Date(sessionData.value.expires_at)
  const minutesLeft = (expiresAt.getTime() - now.getTime()) / 60000
  if (minutesLeft < 15) return 'expires_soon'
  if (sessionData.value.max_players && sessionData.value.current_players >= sessionData.value.max_players) return 'full'
  return 'open'
})

const timeLeft = computed(() => {
  if (!sessionData.value) return ''
  const now = new Date()
  const expiresAt = new Date(sessionData.value.expires_at)
  const minutes = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 60000))
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) return `${hours}h${mins > 0 ? `${String(mins).padStart(2, '0')}` : ''}`
  return `${mins}min`
})

const playersLabel = computed(() => {
  if (!sessionData.value) return ''
  const { current_players, max_players } = sessionData.value
  return max_players
    ? `${current_players} / ${max_players}`
    : `${current_players} joueur${current_players > 1 ? 's' : ''}`
})

const canJoin = computed(() =>
  !isOwner.value
  && !hasJoined.value
  && sessionStatus.value !== 'full'
)

// ─── Actions ──────────────────────────────────────────

async function joinSession(force = false) {
  joining.value = true
  try {
    await $fetch(`/api/sessions/${sessionId}/join`, {
      method: 'POST',
      body: force ? { force: true } : {}
    })
    await fetchSession()
    await fetchMessages()
  } catch (e: any) {
    if (e.data?.data?.code === 'ALREADY_IN_SESSION') {
      switchFromSession.value = {
        id: e.data.data.currentSessionId,
        gameName: e.data.data.currentSessionGameName
      }
      showSwitchConfirm.value = true
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
    const result = await $fetch<any>(`/api/sessions/${sessionId}/leave`, {
      method: 'POST',
      body: confirm ? { confirm: true } : {}
    })
    if (result.needsConfirm) {
      leaveInfo.value = {
        hasOthers: result.hasOthers,
        nextLeader: result.nextLeader
      }
      showLeaveConfirm.value = true
      return
    }
    await fetchSession()
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

// ─── Chat ─────────────────────────────────────────────

function scrollToBottom() {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

function isNearBottom() {
  if (!chatContainer.value) return true
  const { scrollTop, scrollHeight, clientHeight } = chatContainer.value
  return scrollHeight - scrollTop - clientHeight < 80
}

async function postMessage() {
  if (!newMessage.value.trim()) return
  const content = newMessage.value.trim()
  postingMessage.value = true
  newMessage.value = ''
  try {
    const result = await $fetch<{ id: string }>(`/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: { content }
    })
    // Optimistic: add message locally if not already added via WS
    if (!messages.value.some(m => m.id === result.id)) {
      messages.value.push({
        id: result.id,
        sessionId,
        userId: user.value?.id,
        username: user.value?.username ?? user.value?.name ?? '',
        userImage: user.value?.image ?? null,
        content,
        createdAt: new Date().toISOString()
      })
      await nextTick()
      scrollToBottom()
    }
  } catch {
    // Restore message on error
    newMessage.value = content
  } finally {
    postingMessage.value = false
  }
}

function messageTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return 'a l\'instant'
  if (diffMin < 60) return `il y a ${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH}h`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ─── WebSocket listeners ──────────────────────────────

let unsubMessage: (() => void) | null = null
let unsubUpdate: (() => void) | null = null
let pollInterval: ReturnType<typeof setInterval> | null = null

async function pollMessages() {
  try {
    const fresh = await $fetch<any[]>(`/api/sessions/${sessionId}/messages`)
    if (fresh.length > messages.value.length) {
      const wasNearBottom = isNearBottom()
      // Merge only new messages
      for (const msg of fresh) {
        if (!messages.value.some(m => m.id === msg.id)) {
          messages.value.push(msg)
        }
      }
      if (wasNearBottom) {
        await nextTick()
        scrollToBottom()
      }
    }
  } catch {
    // silently ignore
  }
}

onMounted(() => {
  fetchSession()
  fetchMessages()

  unsubMessage = on('session:message', (msg: any) => {
    const data = msg.payload
    if (data.sessionId !== sessionId) return
    // Avoid duplicates
    if (messages.value.some(m => m.id === data.id)) return
    const wasNearBottom = isNearBottom()
    messages.value.push(data)
    if (wasNearBottom) {
      nextTick(() => scrollToBottom())
    }
  })

  unsubUpdate = on('session:update', () => {
    fetchSession()
  })

  // Fallback polling every 5s for chat reliability
  pollInterval = setInterval(pollMessages, 5000)
})

onUnmounted(() => {
  unsubMessage?.()
  unsubUpdate?.()
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <div>
    <!-- Loading -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-6 animate-spin text-muted"
      />
    </div>

    <!-- Not found -->
    <div
      v-else-if="!sessionData"
      class="text-center py-12"
    >
      <p class="text-muted">
        Session introuvable.
      </p>
      <UButton
        label="Retour"
        icon="i-lucide-arrow-left"
        variant="outline"
        class="mt-4"
        to="/"
      />
    </div>

    <!-- Session detail -->
    <template v-else>
      <!-- Back + header -->
      <div class="mb-6">
        <UButton
          label="Sessions"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          size="sm"
          to="/"
          class="mb-3"
        />

        <div class="flex items-start gap-3 sm:gap-4">
          <img
            v-if="sessionData.game_cover_url"
            :src="sessionData.game_cover_url"
            :alt="sessionData.game_name"
            class="w-14 h-18 sm:w-16 sm:h-20 rounded object-cover shrink-0"
          >
          <div
            v-else-if="sessionData.game_name"
            class="w-14 h-18 sm:w-16 sm:h-20 rounded bg-violet-500/20 text-violet-500 flex items-center justify-center text-lg font-bold shrink-0"
          >
            {{ sessionData.game_name.charAt(0) }}
          </div>
          <div
            v-else
            class="w-14 h-18 sm:w-16 sm:h-20 rounded bg-violet-500/20 text-violet-500 flex items-center justify-center shrink-0"
          >
            <UIcon
              name="i-lucide-gamepad-2"
              class="size-6"
            />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1">
              <h1 class="text-xl sm:text-2xl font-bold break-words">
                {{ sessionData.game_name || 'Session libre' }}
              </h1>
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
            <p class="text-sm text-muted">
              <UIcon
                name="i-lucide-clock"
                class="size-3.5 inline-block mr-1"
              />
              {{ timeLeft }} restantes
              <span class="mx-1">&middot;</span>
              <UIcon
                name="i-lucide-users"
                class="size-3.5 inline-block mr-1"
              />
              {{ playersLabel }}
            </p>
            <p class="text-sm text-muted mt-1">
              <UserPopover
                :user-id="sessionData.created_by"
                :name="sessionData.creator_name"
                :avatar="sessionData.creator_avatar"
              />
              <span
                v-if="sessionData.community_name"
                class="mx-1"
              >&middot;</span>
              <span
                v-if="sessionData.community_name"
                class="text-violet-500"
              >via {{ sessionData.community_name }}</span>
            </p>
          </div>
        </div>

        <p
          v-if="sessionData.discussion"
          class="mt-3 text-sm text-muted"
        >
          <UIcon
            name="i-lucide-message-circle"
            class="size-3.5 inline-block mr-1"
          />
          {{ sessionData.discussion }}
        </p>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap gap-2 mb-6">
        <UButton
          v-if="canJoin"
          label="Rejoindre"
          icon="i-lucide-log-in"
          size="sm"
          :loading="joining"
          @click="joinSession()"
        />
        <UButton
          v-else-if="hasJoined && !isOwner"
          label="Quitter"
          icon="i-lucide-log-out"
          variant="outline"
          color="error"
          size="sm"
          :loading="leaving"
          @click="leaveSession()"
        />
        <UButton
          v-else-if="isOwner"
          label="Quitter"
          icon="i-lucide-log-out"
          variant="outline"
          color="error"
          size="sm"
          :loading="leaving"
          @click="leaveSession()"
        />
      </div>

      <!-- Participants -->
      <div class="mb-6">
        <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          Participants ({{ sessionData.participants?.length ?? 0 }})
        </h2>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="p in sessionData.participants"
            :key="p.userId"
            class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-elevated text-sm"
          >
            <UserPopover
              :user-id="p.userId"
              :name="p.username"
              :avatar="p.image"
            >
              <span class="inline-flex items-center gap-1.5 cursor-pointer">
                <UAvatar
                  :src="p.image ?? undefined"
                  :alt="p.username"
                  size="2xs"
                />
                {{ p.username }}
              </span>
            </UserPopover>
            <UBadge
              v-if="p.userId === sessionData.created_by"
              color="primary"
              variant="subtle"
              size="xs"
            >
              Createur
            </UBadge>
          </div>
          <p
            v-if="!sessionData.participants?.length"
            class="text-sm text-muted"
          >
            Aucun participant.
          </p>
        </div>
      </div>

      <!-- Chat -->
      <div v-if="hasJoined || isOwner">
        <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          Chat
        </h2>

        <div
          ref="chatContainer"
          class="max-h-96 overflow-y-auto space-y-3 mb-4 rounded-lg border border-default p-4"
        >
          <template
            v-for="msg in messages"
            :key="msg.id"
          >
            <!-- System message -->
            <div
              v-if="msg.type === 'system'"
              class="flex items-center gap-2 py-1"
            >
              <div class="flex-1 h-px bg-muted/30" />
              <span class="text-xs text-muted italic whitespace-nowrap">
                {{ msg.content }}
              </span>
              <div class="flex-1 h-px bg-muted/30" />
            </div>
            <!-- User message -->
            <div
              v-else
              class="flex gap-2"
            >
              <UAvatar
                :src="msg.userImage ?? undefined"
                :alt="msg.username"
                size="xs"
                class="shrink-0 mt-0.5"
              />
              <div>
                <div class="flex items-baseline gap-2">
                  <UserPopover
                    :user-id="msg.userId"
                    :name="msg.username"
                    :avatar="msg.userImage"
                  >
                    <span class="text-sm font-medium cursor-pointer hover:underline">{{ msg.username }}</span>
                  </UserPopover>
                  <span class="text-xs text-muted">{{ messageTime(msg.createdAt) }}</span>
                </div>
                <p class="text-sm">
                  {{ msg.content }}
                </p>
              </div>
            </div>
          </template>
          <p
            v-if="!messages.length"
            class="text-sm text-muted text-center py-4"
          >
            Aucun message. Lancez la conversation !
          </p>
        </div>

        <!-- Post message -->
        <form
          class="flex gap-2"
          @submit.prevent="postMessage"
        >
          <UInput
            v-model="newMessage"
            placeholder="Ecrire un message..."
            class="flex-1"
            @keydown.enter.exact.prevent="postMessage"
          />
          <UButton
            type="submit"
            icon="i-lucide-send"
            size="sm"
            :loading="postingMessage"
            :disabled="!newMessage.trim()"
          />
        </form>
      </div>

      <!-- Chat locked for non-participants -->
      <div
        v-else
        class="rounded-lg border border-default p-6 text-center"
      >
        <UIcon
          name="i-lucide-message-circle"
          class="size-8 text-muted mb-2"
        />
        <p class="text-sm text-muted">
          Rejoins la session pour acceder au chat.
        </p>
      </div>
    </template>

    <!-- Switch session confirmation -->
    <UModal
      :open="showSwitchConfirm"
      @update:open="showSwitchConfirm = $event"
    >
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
    <UModal
      :open="showLeaveConfirm"
      @update:open="showLeaveConfirm = $event"
    >
      <template #header>
        <h3 class="text-lg font-semibold">
          Quitter ta session
        </h3>
      </template>
      <template #body>
        <p
          v-if="leaveInfo?.hasOthers"
          class="text-sm mb-4"
        >
          Le lead sera transfere a <strong>{{ leaveInfo.nextLeader?.username }}</strong>.
          Tu veux continuer ?
        </p>
        <p
          v-else
          class="text-sm mb-4"
        >
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
