<script setup lang="ts">
interface PlatformGame {
  id: string
  platformGameId: string
  name: string
  playtimeTotal: number
  playtimeRecent: number | null
  lastPlayed: string | null
  iconUrl: string | null
  coverUrl: string | null
}

interface PlatformAccount {
  id: string
  platformId: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  profileUrl: string | null
  lastSync: string | null
}

interface PlatformLibraryResponse {
  success: boolean
  account: PlatformAccount | null
  games: PlatformGame[]
  stats?: {
    totalGames: number
    totalPlaytime: number
    recentlyPlayed: number
  }
}

const props = defineProps<{
  platform: 'steam' | 'playstation' | 'xbox'
  label: string
  icon: string
  // Aspect ratio for the cover art tile (Steam = 460/215 paysage, PSN = 1/1 icon).
  coverAspect: string
}>()

const emit = defineEmits<{
  syncDone: []
}>()

const toast = useToast()
const data = ref<PlatformLibraryResponse | null>(null)
const loading = ref(true)
const syncing = ref(false)

async function load() {
  loading.value = true
  try {
    data.value = await $fetch<PlatformLibraryResponse>(`/api/platforms/${props.platform}/games`)
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }
}

async function sync() {
  syncing.value = true
  try {
    const result = await $fetch<{ success: boolean, syncedGames: number, syncedAchievements: number, message?: string }>(
      `/api/platforms/${props.platform}/sync`,
      { method: 'POST' }
    )
    toast.add({
      title: `Synchronisation ${props.label}`,
      description: result.message ?? `${result.syncedGames} jeu(x), ${result.syncedAchievements} succès`,
      color: 'success'
    })
    await load()
    emit('syncDone')
  } catch (err: unknown) {
    const message = (err as { data?: { statusMessage?: string }, statusMessage?: string })?.data?.statusMessage
      ?? (err as { statusMessage?: string })?.statusMessage
      ?? 'Erreur lors de la synchronisation'
    toast.add({ title: 'Erreur', description: message, color: 'error' })
  } finally {
    syncing.value = false
  }
}

function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  return h < 1000 ? `${h}h` : `${(h / 1000).toFixed(1)}k h`
}

function formatLastSync(iso: string | null): string {
  if (!iso) return 'jamais'
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'à l\'instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
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

    <!-- Not connected -->
    <div v-else-if="!data?.account">
      <slot
        name="connect"
        :label="label"
        :icon="icon"
      />
    </div>

    <!-- Connected -->
    <div
      v-else
      class="lg:flex-1 lg:flex lg:flex-col lg:min-h-0 space-y-6 lg:space-y-0 lg:gap-6"
    >
      <!-- Account card -->
      <div class="rounded-lg border border-default bg-default p-4 flex items-center gap-4 shrink-0">
        <UAvatar
          :src="data.account.avatarUrl ?? undefined"
          :alt="data.account.displayName ?? label"
          size="lg"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <UIcon
              :name="icon"
              class="size-4 text-muted"
            />
            <span class="font-semibold truncate">{{ data.account.displayName ?? data.account.username ?? data.account.platformId }}</span>
          </div>
          <p class="text-xs text-muted">
            Dernière sync : {{ formatLastSync(data.account.lastSync) }}
          </p>
        </div>
        <UButton
          label="Synchroniser"
          icon="i-lucide-refresh-cw"
          :loading="syncing"
          @click="sync"
        />
      </div>

      <!-- Stats -->
      <div
        v-if="data.stats"
        class="grid grid-cols-3 gap-4 shrink-0"
      >
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
            Joués (2 sem.)
          </p>
          <p class="text-2xl font-bold mt-1">
            {{ data.stats.recentlyPlayed }}
          </p>
        </div>
      </div>

      <!-- Games grid -->
      <div
        v-if="data.games.length > 0"
        class="lg:flex-1 lg:overflow-y-auto lg:min-h-0 lg:pr-2 lg:pb-2"
      >
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
          <NuxtLink
            v-for="game in data.games"
            :key="game.id"
            :to="`/library/games/${game.id}`"
            class="group block rounded-lg border border-default bg-default overflow-hidden transition-colors hover:border-violet-500/50"
          >
            <div
              class="relative bg-elevated"
              :style="{ aspectRatio: coverAspect }"
            >
              <img
                v-if="game.coverUrl"
                :src="game.coverUrl"
                :alt="game.name"
                class="w-full h-full object-cover"
                loading="lazy"
              >
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-2xl font-bold text-violet-500/40"
              >
                {{ game.name.charAt(0) }}
              </div>
            </div>
            <div class="p-2">
              <h3
                class="text-xs font-semibold truncate"
                :title="game.name"
              >
                {{ game.name }}
              </h3>
              <p class="text-[11px] text-muted mt-0.5 truncate">
                {{ formatPlaytime(game.playtimeTotal) }}
                <template v-if="game.playtimeRecent">
                  · {{ formatPlaytime(game.playtimeRecent) }} récent
                </template>
              </p>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Empty (connected but no games yet) -->
      <div
        v-else
        class="text-center py-12"
      >
        <UIcon
          name="i-lucide-gamepad-2"
          class="size-12 text-muted mx-auto mb-3"
        />
        <p class="text-muted">
          Aucun jeu synchronisé. Clique sur "Synchroniser" pour récupérer ta bibliothèque {{ label }}.
        </p>
      </div>
    </div>
  </div>
</template>
