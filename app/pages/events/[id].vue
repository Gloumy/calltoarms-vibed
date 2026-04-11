<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const route = useRoute()
const { user } = useAuth()
const eventId = route.params.id as string

const eventData = ref<any>(null)
const loading = ref(true)
const newComment = ref('')
const postingComment = ref(false)
const newCommentsCount = ref(0)
let pollInterval: ReturnType<typeof setInterval> | null = null

// Invite system
const showInvitePanel = ref(false)
const friends = ref<any[]>([])
const loadingFriends = ref(false)
const inviting = ref(false)

// Poll creation
const showPollForm = ref(false)
const pollQuestion = ref('')
const pollOptions = ref(['', ''])
const creatingPoll = ref(false)

async function fetchEvent() {
  try {
    eventData.value = await $fetch(`/api/events/${eventId}`)
  } catch {
    eventData.value = null
  } finally {
    loading.value = false
  }
}

const isOwner = computed(() => user.value?.id === eventData.value?.created_by)

const myStatus = computed(() =>
  eventData.value?.participants?.find((p: any) => p.userId === user.value?.id)?.status
)

async function participate(status: 'accepted' | 'declined' | 'maybe') {
  await $fetch(`/api/events/${eventId}/participate`, {
    method: 'POST',
    body: { status }
  })
  await fetchEvent()
}

async function vote(optionId: string) {
  await $fetch(`/api/events/${eventId}/vote`, {
    method: 'POST',
    body: { optionId }
  })
  await fetchEvent()
}

async function postComment() {
  if (!newComment.value.trim()) return
  postingComment.value = true
  try {
    await $fetch(`/api/events/${eventId}/comments`, {
      method: 'POST',
      body: { content: newComment.value.trim() }
    })
    newComment.value = ''
    newCommentsCount.value = 0
    await fetchEvent()
  } finally {
    postingComment.value = false
  }
}

function addPollOption() {
  pollOptions.value.push('')
}

function removePollOption(index: number) {
  if (pollOptions.value.length > 2) {
    pollOptions.value.splice(index, 1)
  }
}

async function createPoll() {
  const validOptions = pollOptions.value.filter(o => o.trim())
  if (!pollQuestion.value.trim() || validOptions.length < 2) return
  creatingPoll.value = true
  try {
    await $fetch(`/api/events/${eventId}/polls`, {
      method: 'POST',
      body: {
        question: pollQuestion.value.trim(),
        options: validOptions
      }
    })
    pollQuestion.value = ''
    pollOptions.value = ['', '']
    showPollForm.value = false
    await fetchEvent()
  } finally {
    creatingPoll.value = false
  }
}

const scheduledDate = computed(() => {
  if (!eventData.value) return ''
  const d = new Date(eventData.value.scheduled_at)
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  })
})

function commentTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return 'a l\'instant'
  if (diffMin < 60) return `il y a ${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH}h`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

async function openInvitePanel() {
  showInvitePanel.value = true
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

const invitableFriends = computed(() => {
  const participantIds = new Set(
    (eventData.value?.participants ?? []).map((p: any) => p.userId)
  )
  return friends.value.filter(f => !participantIds.has(f.id))
})

async function inviteUser(userId: string) {
  inviting.value = true
  try {
    await $fetch(`/api/events/${eventId}/invite`, {
      method: 'POST',
      body: { userIds: [userId] }
    })
    await fetchEvent()
  } finally {
    inviting.value = false
  }
}

async function pollComments() {
  try {
    const comments = await $fetch<any[]>(`/api/events/${eventId}/comments`)
    const currentCount = eventData.value?.comments?.length ?? 0
    if (comments.length > currentCount) {
      newCommentsCount.value = comments.length - currentCount
    }
  } catch {
    // silently ignore
  }
}

function showNewComments() {
  newCommentsCount.value = 0
  fetchEvent()
}

onMounted(() => {
  fetchEvent()
  pollInterval = setInterval(pollComments, 30000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
    </div>

    <!-- Not found -->
    <div v-else-if="!eventData" class="text-center py-12">
      <p class="text-muted">
        Evenement introuvable.
      </p>
      <UButton label="Retour" icon="i-lucide-arrow-left" variant="outline" class="mt-4" to="/events" />
    </div>

    <!-- Event detail -->
    <template v-else>
      <!-- Back + title -->
      <div class="mb-6">
        <UButton label="Evenements" icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" to="/events" class="mb-3" />

        <div class="flex items-start gap-4">
          <img
            v-if="eventData.game_cover_url"
            :src="eventData.game_cover_url"
            :alt="eventData.game_name"
            class="w-16 h-20 rounded object-cover shrink-0"
          >
          <div>
            <h1 class="text-2xl font-bold mb-1">
              {{ eventData.title }}
            </h1>
            <p class="text-sm text-muted">
              <UIcon name="i-lucide-clock" class="size-3.5 inline-block mr-1" />
              {{ scheduledDate }}
              <span v-if="eventData.game_name" class="mx-1">&middot;</span>
              <span v-if="eventData.game_name">{{ eventData.game_name }}</span>
            </p>
            <p class="text-sm text-muted mt-1">
              <span class="inline-flex items-center gap-1">
                <UAvatar :src="eventData.creator_avatar ?? undefined" :alt="eventData.creator_name" size="3xs" />
                {{ eventData.creator_name }}
              </span>
              <span v-if="eventData.community_name" class="mx-1">&middot;</span>
              <span v-if="eventData.community_name" class="text-violet-500">{{ eventData.community_name }}</span>
            </p>
          </div>
        </div>

        <p v-if="eventData.description" class="mt-3 text-sm">
          {{ eventData.description }}
        </p>

        <p v-if="eventData.discussion" class="mt-2 text-xs text-muted">
          <UIcon name="i-lucide-message-circle" class="size-3.5 inline-block mr-1" />
          {{ eventData.discussion }}
        </p>
      </div>

      <!-- Participation buttons -->
      <div v-if="!isOwner" class="flex gap-2 mb-6">
        <UButton
          label="Participer"
          icon="i-lucide-check"
          :variant="myStatus === 'accepted' ? 'solid' : 'outline'"
          :color="myStatus === 'accepted' ? 'success' : 'neutral'"
          size="sm"
          @click="participate('accepted')"
        />
        <UButton
          label="Peut-etre"
          icon="i-lucide-help-circle"
          :variant="myStatus === 'maybe' ? 'solid' : 'outline'"
          :color="myStatus === 'maybe' ? 'warning' : 'neutral'"
          size="sm"
          @click="participate('maybe')"
        />
        <UButton
          label="Decliner"
          icon="i-lucide-x"
          :variant="myStatus === 'declined' ? 'solid' : 'outline'"
          :color="myStatus === 'declined' ? 'error' : 'neutral'"
          size="sm"
          @click="participate('declined')"
        />
      </div>

      <!-- Participants -->
      <div class="mb-6">
        <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          Participants ({{ eventData.participants?.filter((p: any) => p.status === 'accepted').length ?? 0 }})
        </h2>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="p in eventData.participants?.filter((p: any) => p.status === 'accepted')"
            :key="p.userId"
            class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-elevated text-sm"
          >
            <UAvatar :src="p.image ?? undefined" :alt="p.username" size="2xs" />
            {{ p.username }}
          </div>
          <p v-if="!eventData.participants?.some((p: any) => p.status === 'accepted')" class="text-sm text-muted">
            Aucun participant pour l'instant.
          </p>
        </div>

        <!-- Maybe -->
        <template v-if="eventData.participants?.some((p: any) => p.status === 'maybe')">
          <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mt-4 mb-3">
            Peut-etre ({{ eventData.participants?.filter((p: any) => p.status === 'maybe').length }})
          </h2>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="p in eventData.participants?.filter((p: any) => p.status === 'maybe')"
              :key="p.userId"
              class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-elevated text-sm opacity-75"
            >
              <UAvatar :src="p.image ?? undefined" :alt="p.username" size="2xs" />
              {{ p.username }}
            </div>
          </div>
        </template>

        <!-- Invited (pending) -->
        <template v-if="eventData.participants?.some((p: any) => p.status === 'invited')">
          <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mt-4 mb-3">
            Invites en attente ({{ eventData.participants?.filter((p: any) => p.status === 'invited').length }})
          </h2>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="p in eventData.participants?.filter((p: any) => p.status === 'invited')"
              :key="p.userId"
              class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-elevated text-sm opacity-50"
            >
              <UAvatar :src="p.image ?? undefined" :alt="p.username" size="2xs" />
              {{ p.username }}
            </div>
          </div>
        </template>

        <!-- Invite button (owner only) -->
        <div v-if="isOwner" class="mt-4">
          <UButton
            v-if="!showInvitePanel"
            label="Inviter des amis"
            icon="i-lucide-user-plus"
            variant="outline"
            color="neutral"
            size="sm"
            @click="openInvitePanel"
          />
          <div v-else class="rounded-lg border border-default p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium">Inviter un ami</span>
              <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" @click="showInvitePanel = false" />
            </div>
            <div v-if="loadingFriends" class="text-sm text-muted py-2">
              <UIcon name="i-lucide-loader-2" class="size-4 animate-spin inline-block mr-1" />
              Chargement...
            </div>
            <div v-else-if="invitableFriends.length === 0" class="text-sm text-muted py-2">
              Tous vos amis sont deja invites.
            </div>
            <div v-else class="max-h-48 overflow-y-auto space-y-1">
              <div
                v-for="f in invitableFriends"
                :key="f.id"
                class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-elevated"
              >
                <UAvatar :src="f.image ?? undefined" :alt="f.username" size="2xs" />
                <span class="flex-1 text-sm truncate">{{ f.username }}</span>
                <UButton
                  label="Inviter"
                  icon="i-lucide-send"
                  variant="ghost"
                  size="xs"
                  :loading="inviting"
                  @click="inviteUser(f.id)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Polls -->
      <div v-if="eventData.polls?.length > 0 || isOwner" class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-muted uppercase tracking-wider">
            Sondages
          </h2>
          <UButton
            v-if="isOwner && !showPollForm"
            icon="i-lucide-plus"
            label="Ajouter"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="showPollForm = true"
          />
        </div>

        <!-- Existing polls -->
        <div v-for="poll in eventData.polls" :key="poll.id" class="mb-4 rounded-lg border border-default p-4">
          <h3 class="text-sm font-medium mb-3">
            {{ poll.question }}
          </h3>
          <div class="space-y-2">
            <button
              v-for="option in poll.options"
              :key="option.id"
              type="button"
              class="w-full text-left rounded-md border px-3 py-2 text-sm transition-colors"
              :class="option.my_vote
                ? 'border-violet-500 bg-violet-500/10 text-violet-500'
                : 'border-default hover:border-violet-500/50'"
              @click="vote(option.id)"
            >
              <div class="flex items-center justify-between">
                <span>{{ option.label }}</span>
                <span class="text-xs text-muted">{{ option.vote_count }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- New poll form -->
        <div v-if="showPollForm" class="rounded-lg border border-default p-4">
          <UFormField label="Question" class="mb-3">
            <UInput v-model="pollQuestion" placeholder="Quel jeu on fait ?" class="w-full" />
          </UFormField>
          <div v-for="(_, i) in pollOptions" :key="i" class="flex gap-2 mb-2">
            <UInput v-model="pollOptions[i]" :placeholder="`Option ${i + 1}`" class="flex-1" />
            <UButton
              v-if="pollOptions.length > 2"
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="removePollOption(i)"
            />
          </div>
          <div class="flex gap-2 mt-3">
            <UButton label="Ajouter une option" icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="addPollOption" />
            <div class="flex-1" />
            <UButton label="Annuler" variant="ghost" color="neutral" size="xs" @click="showPollForm = false" />
            <UButton label="Creer" icon="i-lucide-check" size="xs" :loading="creatingPoll" @click="createPoll" />
          </div>
        </div>
      </div>

      <!-- Comments -->
      <div>
        <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          Commentaires ({{ eventData.comments?.length ?? 0 }})
        </h2>

        <!-- New comments indicator -->
        <button
          v-if="newCommentsCount > 0"
          type="button"
          class="w-full mb-3 px-3 py-2 rounded-md bg-violet-500/10 border border-violet-500/30 text-violet-500 text-sm text-center hover:bg-violet-500/20 transition-colors"
          @click="showNewComments"
        >
          {{ newCommentsCount }} nouveau{{ newCommentsCount > 1 ? 'x' : '' }} commentaire{{ newCommentsCount > 1 ? 's' : '' }} — cliquez pour afficher
        </button>

        <div class="space-y-3 mb-4">
          <div
            v-for="comment in eventData.comments"
            :key="comment.id"
            class="flex gap-2"
          >
            <UAvatar :src="comment.userImage ?? undefined" :alt="comment.username" size="xs" class="shrink-0 mt-0.5" />
            <div>
              <div class="flex items-baseline gap-2">
                <span class="text-sm font-medium">{{ comment.username }}</span>
                <span class="text-xs text-muted">{{ commentTime(comment.createdAt) }}</span>
              </div>
              <p class="text-sm">
                {{ comment.content }}
              </p>
            </div>
          </div>
          <p v-if="!eventData.comments?.length" class="text-sm text-muted">
            Aucun commentaire.
          </p>
        </div>

        <!-- Post comment -->
        <form class="flex gap-2" @submit.prevent="postComment">
          <UInput
            v-model="newComment"
            placeholder="Ecrire un commentaire..."
            class="flex-1"
          />
          <UButton
            type="submit"
            icon="i-lucide-send"
            size="sm"
            :loading="postingComment"
            :disabled="!newComment.trim()"
          />
        </form>
      </div>
    </template>
  </div>
</template>
