<script setup lang="ts">
const props = defineProps<{
  userId: string
  name: string
  avatar?: string | null
}>()

const { user: authUser } = useAuth()

const summary = ref<any>(null)
const loading = ref(false)
const fetched = ref(false)
const sendingRequest = ref(false)

const isSelf = computed(() => authUser.value?.id === props.userId)

async function fetchSummary() {
  if (fetched.value || loading.value) return
  loading.value = true
  try {
    summary.value = await $fetch(`/api/users/${props.userId}/summary`)
  } catch {
    summary.value = null
  } finally {
    loading.value = false
    fetched.value = true
  }
}

async function sendFriendRequest() {
  if (!summary.value) return
  sendingRequest.value = true
  try {
    await $fetch('/api/friends/request', {
      method: 'POST',
      body: { username: summary.value.username }
    })
    summary.value.friendshipStatus = 'pending_sent'
  } catch {
    // silently handled
  } finally {
    sendingRequest.value = false
  }
}

const platformIcons: Record<string, string> = {
  steam: 'i-simple-icons-steam',
  discord: 'i-simple-icons-discord',
  battlenet: 'i-simple-icons-battledotnet',
  epic: 'i-simple-icons-epicgames',
  riot: 'i-simple-icons-riotgames',
  playstation: 'i-simple-icons-playstation',
  xbox: 'i-simple-icons-xbox',
  nintendo: 'i-simple-icons-nintendo'
}

const memberSince = computed(() => {
  if (!summary.value?.createdAt) return ''
  return new Date(summary.value.createdAt).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric'
  })
})
</script>

<template>
  <UPopover mode="hover" :open-delay="300" :close-delay="200" @update:open="(open: boolean) => open && fetchSummary()">
    <slot>
      <span class="inline-flex items-center gap-1 cursor-pointer hover:underline">
        <UAvatar :src="avatar ?? undefined" :alt="name" size="3xs" />
        {{ name }}
      </span>
    </slot>

    <template #content>
      <div class="w-72 p-4">
        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-4">
          <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-muted" />
        </div>

        <!-- Content -->
        <template v-else-if="summary">
          <!-- Header -->
          <div class="flex items-center gap-3 mb-3">
            <UAvatar :src="summary.image ?? undefined" :alt="summary.username" size="lg" />
            <div class="min-w-0">
              <p class="font-semibold truncate">{{ summary.username }}</p>
              <p class="text-xs text-muted">Membre depuis {{ memberSince }}</p>
            </div>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-3 gap-2 mb-3">
            <div class="text-center">
              <p class="text-sm font-bold text-violet-500">{{ summary.stats.friend_count }}</p>
              <p class="text-xs text-muted">Amis</p>
            </div>
            <div class="text-center">
              <p class="text-sm font-bold text-violet-500">{{ summary.stats.session_count }}</p>
              <p class="text-xs text-muted">Sessions</p>
            </div>
            <div class="text-center">
              <p class="text-sm font-bold text-violet-500">{{ summary.stats.community_count }}</p>
              <p class="text-xs text-muted">Communautes</p>
            </div>
          </div>

          <!-- Battle tags (public only) -->
          <div v-if="summary.battleTags?.length > 0" class="mb-3">
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="(bt, i) in summary.battleTags.slice(0, 4)"
                :key="i"
                class="inline-flex items-center gap-1 text-xs bg-elevated px-2 py-1 rounded-md"
              >
                <UIcon :name="platformIcons[bt.platform] ?? 'i-lucide-gamepad-2'" class="size-3" />
                {{ bt.tag }}
              </span>
            </div>
          </div>

          <!-- Shared communities -->
          <div v-if="summary.sharedCommunities?.length > 0 && !summary.isSelf" class="mb-3">
            <p class="text-xs text-muted mb-1">Communautes en commun</p>
            <div class="flex flex-wrap gap-1">
              <UBadge
                v-for="c in summary.sharedCommunities"
                :key="c.id"
                color="neutral"
                variant="subtle"
                size="xs"
              >
                {{ c.name }}
              </UBadge>
            </div>
          </div>

          <!-- Actions -->
          <div v-if="!summary.isSelf" class="flex gap-2">
            <UButton
              v-if="summary.friendshipStatus === 'none'"
              label="Ajouter en ami"
              icon="i-lucide-user-plus"
              size="xs"
              block
              :loading="sendingRequest"
              @click="sendFriendRequest"
            />
            <UBadge
              v-else-if="summary.friendshipStatus === 'friends'"
              color="success"
              variant="subtle"
              size="sm"
              class="w-full justify-center"
            >
              <UIcon name="i-lucide-check" class="size-3 mr-1" />
              Ami
            </UBadge>
            <UBadge
              v-else-if="summary.friendshipStatus === 'pending_sent'"
              color="warning"
              variant="subtle"
              size="sm"
              class="w-full justify-center"
            >
              <UIcon name="i-lucide-clock" class="size-3 mr-1" />
              Demande envoyee
            </UBadge>
            <UBadge
              v-else-if="summary.friendshipStatus === 'pending_received'"
              color="info"
              variant="subtle"
              size="sm"
              class="w-full justify-center"
            >
              <UIcon name="i-lucide-mail" class="size-3 mr-1" />
              T'a envoye une demande
            </UBadge>
          </div>

          <!-- View full profile link -->
          <NuxtLink
            :to="`/users/${summary.id}`"
            class="block text-center text-xs text-violet-500 hover:underline mt-3"
          >
            Voir le profil complet
          </NuxtLink>
        </template>

        <!-- Error -->
        <p v-else class="text-sm text-muted text-center py-2">
          Profil indisponible
        </p>
      </div>
    </template>
  </UPopover>
</template>
