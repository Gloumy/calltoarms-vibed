<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const route = useRoute()
const { user } = useAuth()
const communityId = route.params.id as string

const community = ref<any>(null)
const loading = ref(true)
const joining = ref(false)
const leaving = ref(false)
const updatingNotif = ref(false)
const showCreateSession = ref(false)
const showCreateEvent = ref(false)

// Invite system
const showInvitePanel = ref(false)
const friends = ref<any[]>([])
const loadingFriends = ref(false)
const inviting = ref(false)
const inviteCode = ref<string | null>(null)
const loadingInviteLink = ref(false)
const copiedLink = ref(false)

async function fetchCommunity() {
  try {
    community.value = await $fetch(`/api/communities/${communityId}`)
  } catch {
    community.value = null
  } finally {
    loading.value = false
  }
}

const isOwner = computed(() => user.value?.id === community.value?.created_by)
const isMember = computed(() => community.value?.is_member)
const isAdmin = computed(() => community.value?.my_role === 'admin')
const isInvited = computed(() => community.value?.my_membership_status === 'invited')
const kicking = ref(false)
const responding = ref(false)

async function joinCommunity() {
  joining.value = true
  try {
    await $fetch(`/api/communities/${communityId}/join`, { method: 'POST' })
    await fetchCommunity()
  } finally {
    joining.value = false
  }
}

async function respondToInvite(accept: boolean) {
  responding.value = true
  try {
    await $fetch(`/api/communities/${communityId}/respond`, {
      method: 'POST',
      body: { accept }
    })
    if (!accept) {
      navigateTo('/communities')
      return
    }
    await fetchCommunity()
  } finally {
    responding.value = false
  }
}

async function kickMember(userId: string) {
  kicking.value = true
  try {
    await $fetch(`/api/communities/${communityId}/kick`, {
      method: 'POST',
      body: { userId }
    })
    await fetchCommunity()
  } finally {
    kicking.value = false
  }
}

async function leaveCommunity() {
  leaving.value = true
  try {
    const result = await $fetch<any>(`/api/communities/${communityId}/leave`, { method: 'POST' })
    if (result.deleted) {
      navigateTo('/communities')
      return
    }
    await fetchCommunity()
  } finally {
    leaving.value = false
  }
}

async function setNotifPreference(preference: string) {
  updatingNotif.value = true
  try {
    await $fetch(`/api/communities/${communityId}/notif-preference`, {
      method: 'POST',
      body: { preference }
    })
    if (community.value) {
      community.value.my_notif_preference = preference
    }
  } finally {
    updatingNotif.value = false
  }
}

const canInvite = computed(() => {
  const role = community.value?.my_role
  return role === 'admin' || role === 'moderator'
})

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
  const memberIds = new Set(
    (community.value?.members ?? []).map((m: any) => m.user_id)
  )
  return friends.value.filter(f => !memberIds.has(f.id))
})

async function inviteUser(userId: string) {
  inviting.value = true
  try {
    await $fetch(`/api/communities/${communityId}/invite`, {
      method: 'POST',
      body: { userIds: [userId] }
    })
    await fetchCommunity()
  } finally {
    inviting.value = false
  }
}

async function getInviteLink(regenerate = false) {
  loadingInviteLink.value = true
  try {
    const result = await $fetch<any>(`/api/communities/${communityId}/invite-link`, {
      method: 'POST',
      body: { regenerate }
    })
    inviteCode.value = result.inviteCode
  } finally {
    loadingInviteLink.value = false
  }
}

const inviteUrl = computed(() => {
  if (!inviteCode.value) return ''
  return `${window.location.origin}/communities/invite/${inviteCode.value}`
})

async function copyInviteLink() {
  if (!inviteUrl.value) return
  await navigator.clipboard.writeText(inviteUrl.value)
  copiedLink.value = true
  setTimeout(() => { copiedLink.value = false }, 2000)
}

const notifOptions = [
  { value: 'all', label: 'Toutes', icon: 'i-lucide-bell' },
  { value: 'friends_only', label: 'Amis seulement', icon: 'i-lucide-users' },
  { value: 'none', label: 'Aucune', icon: 'i-lucide-bell-off' }
]

function activityTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return 'a l\'instant'
  if (diffMin < 60) return `il y a ${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `il y a ${diffD}j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

onMounted(() => {
  fetchCommunity()
})
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
    </div>

    <!-- Not found -->
    <div v-else-if="!community" class="text-center py-12">
      <p class="text-muted">
        Communaute introuvable.
      </p>
      <UButton label="Retour" icon="i-lucide-arrow-left" variant="outline" class="mt-4" to="/communities" />
    </div>

    <!-- Community detail -->
    <template v-else>
      <!-- Back + header -->
      <div class="mb-6">
        <UButton label="Communautes" icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" to="/communities" class="mb-3" />

        <div class="flex items-start gap-4">
          <img
            v-if="community.game_cover_url"
            :src="community.game_cover_url"
            :alt="community.game_name"
            class="w-16 h-20 rounded object-cover shrink-0"
          >
          <div
            v-else
            class="w-16 h-20 rounded bg-violet-500/20 text-violet-500 flex items-center justify-center shrink-0"
          >
            <UIcon name="i-lucide-users" class="size-8" />
          </div>

          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <h1 class="text-2xl font-bold">{{ community.name }}</h1>
              <UBadge v-if="!community.is_public" color="neutral" variant="subtle" size="xs">
                Privee
              </UBadge>
            </div>
            <p v-if="community.description" class="text-sm text-muted mb-2">
              {{ community.description }}
            </p>
            <p class="text-sm text-muted">
              <UIcon name="i-lucide-users" class="size-3.5 inline-block mr-1" />
              {{ community.member_count }} membre{{ community.member_count > 1 ? 's' : '' }}
              <span v-if="community.game_name" class="mx-1">&middot;</span>
              <span v-if="community.game_name">{{ community.game_name }}</span>
              <span class="mx-1">&middot;</span>
              <UserPopover :user-id="community.created_by" :name="community.creator_name" :avatar="community.creator_avatar" />
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 shrink-0">
            <template v-if="isInvited">
              <UButton
                label="Accepter"
                icon="i-lucide-check"
                size="sm"
                :loading="responding"
                @click="respondToInvite(true)"
              />
              <UButton
                label="Decliner"
                icon="i-lucide-x"
                variant="outline"
                color="neutral"
                size="sm"
                :loading="responding"
                @click="respondToInvite(false)"
              />
            </template>
            <UButton
              v-else-if="!isMember && community.is_public"
              label="Rejoindre"
              icon="i-lucide-user-plus"
              size="sm"
              :loading="joining"
              @click="joinCommunity"
            />
            <UButton
              v-else-if="isMember"
              label="Quitter"
              icon="i-lucide-log-out"
              variant="outline"
              color="neutral"
              size="sm"
              :loading="leaving"
              @click="leaveCommunity"
            />
          </div>
        </div>
      </div>

      <!-- Member actions: create session/event scoped to community -->
      <div v-if="isMember" class="flex flex-wrap gap-2 mb-6">
        <UButton
          label="Lancer une session"
          icon="i-lucide-rocket"
          size="sm"
          variant="outline"
          @click="showCreateSession = true"
        />
        <UButton
          label="Creer un evenement"
          icon="i-lucide-calendar-plus"
          size="sm"
          variant="outline"
          @click="showCreateEvent = true"
        />
        <UButton
          v-if="canInvite"
          label="Inviter"
          icon="i-lucide-user-plus"
          size="sm"
          variant="outline"
          @click="openInvitePanel"
        />
      </div>

      <!-- Invite panel -->
      <div v-if="showInvitePanel && canInvite" class="mb-6 rounded-lg border border-default p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-muted uppercase tracking-wider">
            Inviter des membres
          </h2>
          <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" @click="showInvitePanel = false" />
        </div>

        <!-- Invite friends -->
        <div class="mb-4">
          <h3 class="text-xs font-medium text-muted mb-2">Inviter des amis</h3>
          <div v-if="loadingFriends" class="text-sm text-muted py-2">
            <UIcon name="i-lucide-loader-2" class="size-4 animate-spin inline-block mr-1" />
            Chargement...
          </div>
          <div v-else-if="invitableFriends.length === 0" class="text-sm text-muted py-2">
            Tous vos amis sont deja membres.
          </div>
          <div v-else class="max-h-40 overflow-y-auto space-y-1">
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

        <!-- Invite link -->
        <div>
          <h3 class="text-xs font-medium text-muted mb-2">Lien d'invitation</h3>
          <div v-if="!inviteCode" class="flex gap-2">
            <UButton
              label="Generer un lien"
              icon="i-lucide-link"
              variant="outline"
              color="neutral"
              size="xs"
              :loading="loadingInviteLink"
              @click="getInviteLink()"
            />
          </div>
          <div v-else class="flex items-center gap-2">
            <code class="flex-1 text-xs bg-elevated px-3 py-2 rounded-md truncate">
              {{ inviteUrl }}
            </code>
            <UButton
              :icon="copiedLink ? 'i-lucide-check' : 'i-lucide-copy'"
              :label="copiedLink ? 'Copie !' : 'Copier'"
              variant="outline"
              color="neutral"
              size="xs"
              @click="copyInviteLink"
            />
            <UButton
              icon="i-lucide-refresh-cw"
              variant="ghost"
              color="neutral"
              size="xs"
              :loading="loadingInviteLink"
              @click="getInviteLink(true)"
            />
          </div>
        </div>
      </div>

      <!-- Notification preferences (member only) -->
      <div v-if="isMember" class="mb-6 rounded-lg border border-default p-4">
        <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          Notifications
        </h2>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="opt in notifOptions"
            :key="opt.value"
            :label="opt.label"
            :icon="opt.icon"
            :variant="community.my_notif_preference === opt.value ? 'solid' : 'outline'"
            :color="community.my_notif_preference === opt.value ? 'primary' : 'neutral'"
            size="xs"
            :loading="updatingNotif"
            @click="setNotifPreference(opt.value)"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Activity feed -->
        <div class="lg:col-span-2">
          <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
            Activite recente
          </h2>

          <div v-if="!community.activity?.length" class="text-sm text-muted py-4">
            Aucune activite pour l'instant.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="item in community.activity"
              :key="item.type + item.id"
              class="flex items-start gap-3 rounded-lg border border-default p-3"
            >
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                :class="item.type === 'session' ? 'bg-violet-500/20 text-violet-500' : 'bg-teal-500/20 text-teal-500'"
              >
                <UIcon :name="item.type === 'session' ? 'i-lucide-gamepad-2' : 'i-lucide-calendar'" class="size-4" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm">
                  <UserPopover :user-id="item.created_by" :name="item.creator_name" :avatar="null">
                    <span class="font-medium cursor-pointer hover:underline">{{ item.creator_name }}</span>
                  </UserPopover>
                  <template v-if="item.type === 'session'">
                    a lance une session
                    <span v-if="item.game_name" class="text-violet-500">{{ item.game_name }}</span>
                  </template>
                  <template v-else>
                    a cree l'evenement
                    <NuxtLink :to="`/events/${item.id}`" class="text-violet-500 hover:underline">
                      {{ item.title }}
                    </NuxtLink>
                  </template>
                </p>
                <p class="text-xs text-muted mt-0.5">
                  {{ activityTime(item.created_at) }}
                  <span class="mx-1">&middot;</span>
                  {{ item.participant_count }} participant{{ item.participant_count > 1 ? 's' : '' }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Members -->
        <div>
          <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
            Membres ({{ community.member_count }})
          </h2>
          <div class="space-y-1">
            <div
              v-for="m in community.members"
              :key="m.user_id"
              class="flex items-center gap-2 px-2 py-1.5 rounded-md group"
            >
              <UserPopover :user-id="m.user_id" :name="m.username" :avatar="m.image">
                <span class="inline-flex items-center gap-2 cursor-pointer">
                  <UAvatar :src="m.image ?? undefined" :alt="m.username" size="2xs" />
                  <span class="text-sm truncate">{{ m.username }}</span>
                </span>
              </UserPopover>
              <UBadge v-if="m.role === 'admin'" color="warning" variant="subtle" size="xs">
                Admin
              </UBadge>
              <UBadge v-else-if="m.role === 'moderator'" color="info" variant="subtle" size="xs">
                Mod
              </UBadge>
              <UButton
                v-if="canInvite && m.user_id !== user?.id && m.user_id !== community.created_by"
                icon="i-lucide-user-x"
                variant="ghost"
                color="error"
                size="xs"
                class="opacity-0 group-hover:opacity-100 transition-opacity"
                :loading="kicking"
                @click="kickMember(m.user_id)"
              />
            </div>
          </div>

          <!-- Pending invites -->
          <template v-if="canInvite && community.pendingInvites?.length > 0">
            <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mt-4 mb-3">
              Invitations en attente ({{ community.pendingInvites.length }})
            </h2>
            <div class="space-y-1">
              <div
                v-for="p in community.pendingInvites"
                :key="p.user_id"
                class="flex items-center gap-2 px-2 py-1.5 rounded-md opacity-60"
              >
                <UAvatar :src="p.image ?? undefined" :alt="p.username" size="2xs" />
                <span class="text-sm flex-1 truncate">{{ p.username }}</span>
                <UBadge color="neutral" variant="subtle" size="xs">
                  En attente
                </UBadge>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Create session modal (scoped to community) -->
      <SessionCreateModal
        v-model:open="showCreateSession"
        :community-id="communityId"
        @created="fetchCommunity()"
      />

      <!-- Create event modal (scoped to community) -->
      <EventCreateModal
        v-model:open="showCreateEvent"
        :community-id="communityId"
        @created="fetchCommunity()"
      />
    </template>
  </div>
</template>
