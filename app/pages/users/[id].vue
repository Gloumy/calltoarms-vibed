<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const route = useRoute()
const { user: authUser } = useAuth()
const userId = route.params.id as string

const profile = ref<any>(null)
const loading = ref(true)
const sendingRequest = ref(false)

const isSelf = computed(() => authUser.value?.id === userId)

async function fetchProfile() {
  try {
    profile.value = await $fetch(`/api/users/${userId}/summary`)
  } catch {
    profile.value = null
  } finally {
    loading.value = false
  }
}

async function sendFriendRequest() {
  if (!profile.value) return
  sendingRequest.value = true
  try {
    await $fetch('/api/friends/request', {
      method: 'POST',
      body: { username: profile.value.username }
    })
    profile.value.friendshipStatus = 'pending_sent'
  } catch {
    // silently handled
  } finally {
    sendingRequest.value = false
  }
}

const platformOptions: Record<string, { label: string, icon: string }> = {
  steam: { label: 'Steam', icon: 'i-simple-icons-steam' },
  discord: { label: 'Discord', icon: 'i-simple-icons-discord' },
  battlenet: { label: 'Battle.net', icon: 'i-simple-icons-battledotnet' },
  epic: { label: 'Epic Games', icon: 'i-simple-icons-epicgames' },
  riot: { label: 'Riot Games', icon: 'i-simple-icons-riotgames' },
  playstation: { label: 'PlayStation', icon: 'i-simple-icons-playstation' },
  xbox: { label: 'Xbox', icon: 'i-simple-icons-xbox' },
  nintendo: { label: 'Nintendo', icon: 'i-simple-icons-nintendo' }
}

const memberSince = computed(() => {
  if (!profile.value?.createdAt) return ''
  return new Date(profile.value.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})

onMounted(() => {
  if (isSelf.value) {
    navigateTo('/profile')
    return
  }
  fetchProfile()
})
</script>

<template>
  <div>
    <UButton
      label="Retour"
      icon="i-lucide-arrow-left"
      variant="ghost"
      color="neutral"
      size="sm"
      class="mb-4"
      @click="$router.back()"
    />

    <div
      v-if="loading"
      class="flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-6 animate-spin text-muted"
      />
    </div>

    <div
      v-else-if="!profile"
      class="text-center py-12"
    >
      <p class="text-muted">
        Utilisateur introuvable.
      </p>
    </div>

    <template v-else>
      <!-- Profile card -->
      <div class="rounded-lg border border-default p-4 sm:p-6 mb-6">
        <div class="flex items-center gap-3 sm:gap-4 flex-wrap">
          <UAvatar
            :src="profile.image ?? undefined"
            :alt="profile.username"
            size="xl"
          />
          <div class="flex-1 min-w-0">
            <h1 class="text-xl font-bold truncate">
              {{ profile.username }}
            </h1>
            <p class="text-xs text-muted mt-1">
              Membre depuis {{ memberSince }}
            </p>
          </div>

          <!-- Friendship action -->
          <UButton
            v-if="profile.friendshipStatus === 'none'"
            label="Ajouter en ami"
            icon="i-lucide-user-plus"
            size="sm"
            :loading="sendingRequest"
            @click="sendFriendRequest"
          />
          <UBadge
            v-else-if="profile.friendshipStatus === 'friends'"
            color="success"
            variant="subtle"
            size="md"
          >
            <UIcon
              name="i-lucide-check"
              class="size-3.5 mr-1"
            />
            Ami
          </UBadge>
          <UBadge
            v-else-if="profile.friendshipStatus === 'pending_sent'"
            color="warning"
            variant="subtle"
            size="md"
          >
            <UIcon
              name="i-lucide-clock"
              class="size-3.5 mr-1"
            />
            Demande envoyee
          </UBadge>
          <UBadge
            v-else-if="profile.friendshipStatus === 'pending_received'"
            color="info"
            variant="subtle"
            size="md"
          >
            <UIcon
              name="i-lucide-mail"
              class="size-3.5 mr-1"
            />
            T'a envoye une demande
          </UBadge>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="rounded-lg border border-default p-4 text-center">
          <p class="text-2xl font-bold text-violet-500">
            {{ profile.stats.friend_count }}
          </p>
          <p class="text-xs text-muted">
            Amis
          </p>
        </div>
        <div class="rounded-lg border border-default p-4 text-center">
          <p class="text-2xl font-bold text-violet-500">
            {{ profile.stats.community_count }}
          </p>
          <p class="text-xs text-muted">
            Communautes
          </p>
        </div>
        <div class="rounded-lg border border-default p-4 text-center">
          <p class="text-2xl font-bold text-violet-500">
            {{ profile.stats.session_count }}
          </p>
          <p class="text-xs text-muted">
            Sessions
          </p>
        </div>
        <div class="rounded-lg border border-default p-4 text-center">
          <p class="text-2xl font-bold text-violet-500">
            {{ profile.stats.event_count }}
          </p>
          <p class="text-xs text-muted">
            Evenements
          </p>
        </div>
      </div>

      <!-- Battle tags -->
      <div
        v-if="profile.battleTags?.length > 0"
        class="rounded-lg border border-default p-4 sm:p-6 mb-6"
      >
        <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
          Identifiants de jeu
        </h2>
        <div class="space-y-2">
          <div
            v-for="(bt, i) in profile.battleTags"
            :key="i"
            class="flex items-center gap-3 px-3 py-2 rounded-md bg-elevated"
          >
            <UIcon
              :name="platformOptions[bt.platform]?.icon ?? 'i-lucide-gamepad-2'"
              class="size-5 shrink-0"
            />
            <span class="text-sm font-medium">{{ platformOptions[bt.platform]?.label ?? bt.platform }}</span>
            <span class="text-sm text-muted flex-1">{{ bt.tag }}</span>
          </div>
        </div>
      </div>

      <!-- Shared communities -->
      <div
        v-if="profile.sharedCommunities?.length > 0"
        class="rounded-lg border border-default p-4 sm:p-6"
      >
        <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
          Communautes en commun
        </h2>
        <div class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="c in profile.sharedCommunities"
            :key="c.id"
            :to="`/communities/${c.id}`"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-elevated text-sm hover:bg-violet-500/10 transition-colors"
          >
            <UIcon
              name="i-lucide-users"
              class="size-3.5"
            />
            {{ c.name }}
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>
