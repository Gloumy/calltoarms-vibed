<script setup lang="ts">
interface Game {
  id: string
  platformGameId: string
  name: string
  iconUrl: string | null
  coverUrl: string | null
  playtimeTotal: number
  playtimeRecent: number | null
  lastPlayed: string | null
  isCompleted: boolean
  completedAt: string | null
  platform: 'steam' | 'playstation' | 'xbox'
  totalAchievements: number
  unlockedAchievements: number
  achievementPercentage: number
}

interface GamesResponse {
  success: boolean
  games: Game[]
  pagination: { limit: number, offset: number, hasMore: boolean }
}

type SortValue = 'playtime-desc' | 'lastPlayed-desc' | 'name-asc' | 'name-desc'
type PlatformValue = 'all' | 'steam' | 'playstation' | 'xbox'

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
  { value: 'xbox', label: 'Xbox' }
]

const sort = ref<SortValue>('playtime-desc')
const platform = ref<PlatformValue>('all')
const search = ref('')
const games = ref<Game[]>([])
const loading = ref(true)

let searchTimer: ReturnType<typeof setTimeout> | null = null

async function load() {
  loading.value = true
  try {
    const [sortBy = 'playtime', sortOrder = 'desc'] = sort.value.split('-')
    const query: Record<string, string> = { sortBy, sortOrder, limit: '500' }
    if (platform.value !== 'all') query.platform = platform.value
    if (search.value.trim()) query.search = search.value.trim()
    const result = await $fetch<GamesResponse>('/api/library/games', { query })
    games.value = result.games
  } catch {
    games.value = []
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
</script>

<template>
  <div class="lg:flex-1 lg:flex lg:flex-col lg:min-h-0 space-y-4 lg:space-y-0 lg:gap-4">
    <!-- Filters -->
    <div class="flex items-center gap-2 flex-wrap shrink-0">
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
      class="flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-6 animate-spin text-muted"
      />
    </div>

    <div
      v-else-if="games.length === 0"
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
        {{ games.length }} jeu{{ games.length > 1 ? 'x' : '' }}
      </p>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
        <GameTile
          v-for="game in games"
          :key="game.id"
          :game="game"
        />
      </div>
    </div>
  </div>
</template>
