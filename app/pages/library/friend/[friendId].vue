<script setup lang="ts">
definePageMeta({
  layout: 'default',
  // Force a fresh fetch when navigating between different friends.
  key: route => route.fullPath
})

interface FriendGame {
  id: string
  platformGameId: string
  name: string
  iconUrl: string | null
  coverUrl: string | null
  playtimeTotal: number
  lastPlayed: string | null
  isCompleted: boolean
  completedAt: string | null
  platform: 'steam' | 'playstation' | 'xbox' | 'manual'
  totalAchievements: number
  unlockedAchievements: number
  achievementPercentage: number
}

interface FriendAccount {
  id: string
  platform: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  profileUrl: string | null
  lastSync: string | null
  gamesCount: number
}

interface FriendLibraryResponse {
  success: boolean
  friend: { id: string, username: string, name: string, image: string | null }
  accounts: FriendAccount[]
  stats: {
    totalConnectedPlatforms: number
    totalGames: number
    totalPlaytime: number
    totalAchievements: number
    unlockedAchievements: number
  }
  games: FriendGame[]
  pagination: { limit: number, offset: number, hasMore: boolean }
}

type SortValue = 'playtime-desc' | 'lastPlayed-desc' | 'name-asc' | 'name-desc'
type PlatformValue = 'all' | 'steam' | 'playstation' | 'xbox' | 'manual'

const SORT_OPTIONS: { value: SortValue, label: string }[] = [
  { value: 'playtime-desc', label: 'Plus joué' },
  { value: 'lastPlayed-desc', label: 'Joué récemment' },
  { value: 'name-asc', label: 'Alphabétique (A→Z)' },
  { value: 'name-desc', label: 'Alphabétique (Z→A)' }
]

const PLATFORM_OPTIONS: { value: PlatformValue, label: string }[] = [
  { value: 'all', label: 'Toutes les plateformes' },
  { value: 'steam', label: 'Steam' },
  { value: 'playstation', label: 'PlayStation' },
  { value: 'xbox', label: 'Xbox' },
  { value: 'manual', label: 'Manuel' }
]

const route = useRoute()
const toast = useToast()

const friendId = computed(() => String(route.params.friendId))

const data = ref<FriendLibraryResponse | null>(null)
const loading = ref(true)
const sort = ref<SortValue>('playtime-desc')
const platform = ref<PlatformValue>('all')
const search = ref('')

let searchTimer: ReturnType<typeof setTimeout> | null = null

async function load() {
  loading.value = true
  try {
    const [sortBy = 'playtime', sortOrder = 'desc'] = sort.value.split('-')
    const query: Record<string, string> = { sortBy, sortOrder, limit: '500' }
    if (platform.value !== 'all') query.platform = platform.value
    if (search.value.trim()) query.search = search.value.trim()
    data.value = await $fetch<FriendLibraryResponse>(`/api/library/friend/${friendId.value}`, { query })
  } catch (err: unknown) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Bibliothèque inaccessible'
    toast.add({ title: 'Erreur', description: message, color: 'error' })
    data.value = null
  } finally {
    loading.value = false
  }
}

watch([sort, platform], load)
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 250)
})

onMounted(load)

function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  return h < 1000 ? `${h}h` : `${(h / 1000).toFixed(1)}k h`
}
</script>

<template>
  <div class="lg:h-[calc(100vh-2rem)] lg:flex lg:flex-col">
    <UButton
      label="Retour à ma bibliothèque"
      icon="i-lucide-arrow-left"
      variant="ghost"
      color="neutral"
      size="sm"
      to="/library"
      class="mb-4 self-start shrink-0"
    />

    <div
      v-if="loading && !data"
      class="flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-6 animate-spin text-muted"
      />
    </div>

    <div
      v-else-if="!data"
      class="text-center py-12 text-muted"
    >
      Bibliothèque indisponible.
    </div>

    <template v-else>
      <!-- Friend header -->
      <div class="rounded-lg border border-default bg-default p-4 flex items-center gap-4 mb-6 shrink-0">
        <UAvatar
          :src="data.friend.image ?? undefined"
          :alt="data.friend.username"
          size="lg"
        />
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-bold truncate">
            Bibliothèque de {{ data.friend.username }}
          </h1>
          <p class="text-xs text-muted">
            {{ data.stats.totalConnectedPlatforms }} plateforme{{ data.stats.totalConnectedPlatforms > 1 ? 's' : '' }} connectée{{ data.stats.totalConnectedPlatforms > 1 ? 's' : '' }}
          </p>
        </div>
        <UButton
          :to="`/users/${data.friend.id}`"
          label="Voir le profil"
          icon="i-lucide-user"
          variant="outline"
          color="neutral"
          size="sm"
        />
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 shrink-0">
        <div class="rounded-lg border border-default bg-default p-4">
          <p class="text-xs text-muted uppercase tracking-wider">
            Plateformes
          </p>
          <p class="text-2xl font-bold mt-1">
            {{ data.stats.totalConnectedPlatforms }}
          </p>
        </div>
        <div class="rounded-lg border border-default bg-default p-4">
          <p class="text-xs text-muted uppercase tracking-wider">
            Jeux
          </p>
          <p class="text-2xl font-bold mt-1">
            {{ data.stats.totalGames }}
          </p>
        </div>
        <div class="rounded-lg border border-default bg-default p-4">
          <p class="text-xs text-muted uppercase tracking-wider">
            Temps de jeu
          </p>
          <p class="text-2xl font-bold mt-1">
            {{ formatPlaytime(data.stats.totalPlaytime) }}
          </p>
        </div>
        <div class="rounded-lg border border-default bg-default p-4">
          <p class="text-xs text-muted uppercase tracking-wider">
            Succès
          </p>
          <p class="text-2xl font-bold mt-1">
            {{ data.stats.unlockedAchievements }}<span class="text-base text-muted">/{{ data.stats.totalAchievements }}</span>
          </p>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-2 flex-wrap shrink-0 mb-4">
        <UInput
          v-model="search"
          placeholder="Rechercher un jeu..."
          icon="i-lucide-search"
          size="sm"
          class="flex-1 min-w-[200px]"
        />
        <USelect
          v-model="platform"
          :items="PLATFORM_OPTIONS"
          value-key="value"
          size="sm"
          class="w-48"
        />
        <USelect
          v-model="sort"
          :items="SORT_OPTIONS"
          value-key="value"
          size="sm"
          class="w-48"
        />
      </div>

      <div
        v-if="loading"
        class="flex items-center justify-center py-6"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="size-5 animate-spin text-muted"
        />
      </div>

      <div
        v-else-if="data.games.length === 0"
        class="text-center py-12 text-muted"
      >
        <UIcon
          name="i-lucide-gamepad-2"
          class="size-12 mx-auto mb-3"
        />
        <p>Aucun jeu trouvé.</p>
      </div>

      <div
        v-else
        class="lg:flex-1 lg:overflow-y-auto lg:min-h-0 lg:pr-2 lg:pb-2"
      >
        <p class="text-xs text-muted uppercase tracking-wider mb-3">
          {{ data.games.length }} jeu{{ data.games.length > 1 ? 'x' : '' }}
        </p>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
          <GameTile
            v-for="game in data.games"
            :key="game.id"
            :game="game"
            :friend-user-id="friendId"
          />
        </div>
      </div>
    </template>
  </div>
</template>
