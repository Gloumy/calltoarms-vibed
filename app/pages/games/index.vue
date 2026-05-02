<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { results, loading: searching, search, clear } = useGameSearch()
const query = ref('')

const allGames = ref<any[]>([])
const favoriteIds = ref<Set<number>>(new Set())
const loadingGames = ref(true)

async function fetchGames() {
  try {
    const [gamesData, favoritesData] = await Promise.all([
      $fetch<any[]>('/api/games'),
      $fetch<any[]>('/api/games/favorites')
    ])
    allGames.value = gamesData
    favoriteIds.value = new Set(favoritesData.map(f => f.gameId ?? f.id))
  } catch {
    allGames.value = []
  } finally {
    loadingGames.value = false
  }
}

function onSearch(value: string) {
  query.value = value
  if (value.length >= 2) {
    search(value)
  } else {
    clear()
  }
}

// Refetch when leaving search mode to pick up newly added games
const isSearching = computed(() => query.value.length >= 2)
let wasSearching = false
watch(isSearching, (searching) => {
  if (!searching && wasSearching) {
    fetchGames()
  }
  wasSearching = searching
})

async function onToggleFavorite(gameId: number) {
  if (favoriteIds.value.has(gameId)) {
    favoriteIds.value.delete(gameId)
  } else {
    favoriteIds.value.add(gameId)
  }
  favoriteIds.value = new Set(favoriteIds.value)
}

const favoriteGames = computed(() =>
  allGames.value.filter(g => favoriteIds.value.has(g.id))
)

const otherGames = computed(() =>
  allGames.value.filter(g => !favoriteIds.value.has(g.id))
)

onMounted(() => {
  fetchGames()
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">
        Jeux
      </h1>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <UInput
        :model-value="query"
        placeholder="Rechercher un jeu..."
        icon="i-lucide-search"
        :loading="searching"
        size="lg"
        class="max-w-md"
        @update:model-value="onSearch"
      />
    </div>

    <!-- Loading -->
    <div
      v-if="loadingGames && !isSearching"
      class="flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-6 animate-spin text-muted"
      />
    </div>

    <!-- Search results -->
    <template v-if="isSearching">
      <div
        v-if="results.length > 0"
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      >
        <GameCard
          v-for="game in results"
          :key="game.id"
          :game="game"
          :favorited="favoriteIds.has(game.id)"
          @toggle-favorite="onToggleFavorite"
        />
      </div>

      <div
        v-else-if="!searching"
        class="text-center py-12"
      >
        <UIcon
          name="i-lucide-search-x"
          class="size-12 text-muted mx-auto mb-3"
        />
        <p class="text-muted">
          Aucun jeu trouve pour "{{ query }}"
        </p>
      </div>
    </template>

    <!-- Browse mode -->
    <template v-else-if="!loadingGames">
      <!-- Favorites section -->
      <div
        v-if="favoriteGames.length > 0"
        class="mb-6"
      >
        <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          Mes favoris
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <GameCard
            v-for="game in favoriteGames"
            :key="game.id"
            :game="game"
            :favorited="true"
            @toggle-favorite="onToggleFavorite"
          />
        </div>
      </div>

      <!-- All games section -->
      <div v-if="otherGames.length > 0">
        <h2
          v-if="favoriteGames.length > 0"
          class="text-sm font-semibold text-muted uppercase tracking-wider mb-3"
        >
          Tous les jeux
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <GameCard
            v-for="game in otherGames"
            :key="game.id"
            :game="game"
            :favorited="false"
            @toggle-favorite="onToggleFavorite"
          />
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="allGames.length === 0"
        class="text-center py-12"
      >
        <UIcon
          name="i-lucide-gamepad-2"
          class="size-12 text-muted mx-auto mb-3"
        />
        <p class="text-muted">
          Aucun jeu en base. Recherche un jeu pour l'ajouter depuis IGDB.
        </p>
      </div>
    </template>
  </div>
</template>
