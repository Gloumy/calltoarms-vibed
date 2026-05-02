<script setup lang="ts">
interface Game {
  id: string
  platformGameId: string
  name: string
  iconUrl: string | null
  coverUrl: string | null
  playtimeTotal: number
  lastPlayed: string | null
  completedAt?: string | null
  isCompleted: boolean
  platform: 'steam' | 'playstation' | 'xbox'
}

interface OverviewResponse {
  success: boolean
  accounts: Array<{
    id: string
    platform: string
    displayName: string | null
    username: string | null
    avatarUrl: string | null
    lastSync: string | null
    gamesCount: number
  }>
  stats: {
    totalConnectedPlatforms: number
    totalGames: number
    totalPlaytime: number
    totalAchievements: number
    unlockedAchievements: number
  }
}

const overview = ref<OverviewResponse | null>(null)
const mostPlayed = ref<Game[]>([])
const recentlyPlayed = ref<Game[]>([])
const recentlyCompleted = ref<Game[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const [ov, mp, rp, rc] = await Promise.all([
      $fetch<OverviewResponse>('/api/library'),
      $fetch<{ games: Game[] }>('/api/library/most-played?limit=12'),
      $fetch<{ games: Game[] }>('/api/library/recently-played?limit=12'),
      $fetch<{ games: Game[] }>('/api/library/recently-completed?limit=12')
    ])
    overview.value = ov
    mostPlayed.value = mp.games
    recentlyPlayed.value = rp.games
    recentlyCompleted.value = rc.games
  } finally {
    loading.value = false
  }
}

function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  return h < 1000 ? `${h}h` : `${(h / 1000).toFixed(1)}k h`
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  if (days < 1) return 'aujourd\'hui'
  if (days < 7) return `il y a ${days}j`
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`
  return `il y a ${Math.floor(days / 365)} an${days >= 730 ? 's' : ''}`
}

defineExpose({ load })

onMounted(load)
</script>

<template>
  <div class="lg:flex-1 lg:flex lg:flex-col lg:min-h-0">
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
      v-else-if="overview && overview.stats.totalConnectedPlatforms === 0"
      class="rounded-lg border border-default bg-default p-8 text-center max-w-xl mx-auto"
    >
      <UIcon
        name="i-lucide-gamepad-2"
        class="size-12 text-muted mx-auto mb-3"
      />
      <h2 class="text-lg font-semibold mb-2">
        Aucune plateforme connectée
      </h2>
      <p class="text-sm text-muted">
        Connecte un compte Steam, PlayStation ou Xbox depuis les onglets ci-dessus pour voir tes statistiques.
      </p>
    </div>

    <div
      v-else-if="overview"
      class="lg:flex-1 lg:overflow-y-auto lg:min-h-0 lg:pr-2 space-y-6 pb-2"
    >
      <!-- Stats grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="rounded-lg border border-default bg-default p-4">
          <p class="text-xs text-muted uppercase tracking-wider">
            Plateformes
          </p>
          <p class="text-2xl font-bold mt-1">
            {{ overview.stats.totalConnectedPlatforms }}
          </p>
        </div>
        <div class="rounded-lg border border-default bg-default p-4">
          <p class="text-xs text-muted uppercase tracking-wider">
            Jeux
          </p>
          <p class="text-2xl font-bold mt-1">
            {{ overview.stats.totalGames }}
          </p>
        </div>
        <div class="rounded-lg border border-default bg-default p-4">
          <p class="text-xs text-muted uppercase tracking-wider">
            Temps de jeu
          </p>
          <p class="text-2xl font-bold mt-1">
            {{ formatPlaytime(overview.stats.totalPlaytime) }}
          </p>
        </div>
        <div class="rounded-lg border border-default bg-default p-4">
          <p class="text-xs text-muted uppercase tracking-wider">
            Succès
          </p>
          <p class="text-2xl font-bold mt-1">
            {{ overview.stats.unlockedAchievements }}<span class="text-base text-muted">/{{ overview.stats.totalAchievements }}</span>
          </p>
        </div>
      </div>

      <!-- Recently played -->
      <section v-if="recentlyPlayed.length > 0">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-muted mb-3">
          Récemment joué
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
          <GameTile
            v-for="game in recentlyPlayed"
            :key="game.id"
            :game="game"
            :caption="formatRelative(game.lastPlayed)"
          />
        </div>
      </section>

      <!-- Most played -->
      <section v-if="mostPlayed.length > 0">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-muted mb-3">
          Plus joué
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
          <GameTile
            v-for="game in mostPlayed"
            :key="game.id"
            :game="game"
          />
        </div>
      </section>

      <!-- Recently completed -->
      <section v-if="recentlyCompleted.length > 0">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-muted mb-3">
          Récemment terminé
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
          <GameTile
            v-for="game in recentlyCompleted"
            :key="game.id"
            :game="game"
            :caption="formatRelative(game.completedAt)"
          />
        </div>
      </section>

      <p
        v-if="recentlyPlayed.length === 0 && mostPlayed.length === 0 && recentlyCompleted.length === 0"
        class="text-center text-muted py-12"
      >
        Lance une synchronisation depuis un onglet plateforme pour voir tes jeux apparaître ici.
      </p>
    </div>
  </div>
</template>
