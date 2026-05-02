<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

interface Achievement {
  id: string
  achievementId: string
  name: string
  description: string | null
  iconUrl: string | null
  isUnlocked: boolean
  unlockedAt: string | null
  earnedRate: number | null
  rarity: number | null
  points: number | null
}

interface GameDetailResponse {
  success: boolean
  isOwnGame: boolean
  game: {
    id: string
    platformGameId: string
    name: string
    playtimeTotal: number
    playtimeRecent: number | null
    lastPlayed: string | null
    iconUrl: string | null
    coverUrl: string | null
    isInstalled: boolean
    isCompleted: boolean
    completedAt: string | null
    account: {
      id: string
      platform: 'steam' | 'playstation' | 'xbox'
      platformId: string
      username: string | null
      displayName: string | null
      avatarUrl: string | null
      profileUrl: string | null
    }
  }
  achievements: Achievement[]
  stats: {
    totalAchievements: number
    unlockedAchievements: number
    completionPercentage: number
    totalPoints: number
    unlockedPoints: number
    rarityStats: {
      common: number
      uncommon: number
      rare: number
      ultraRare: number
    }
  }
}

const route = useRoute()
const toast = useToast()
const data = ref<GameDetailResponse | null>(null)
const loading = ref(true)
const updatingCompletion = ref(false)
const showLocked = ref(true)
const filterQuery = ref('')

const gameId = computed(() => String(route.params.id))
const friendUserId = computed(() => typeof route.query.userId === 'string' ? route.query.userId : undefined)

async function load() {
  loading.value = true
  try {
    data.value = await $fetch<GameDetailResponse>(`/api/library/games/${gameId.value}`, {
      query: friendUserId.value ? { userId: friendUserId.value } : undefined
    })
  } catch (err: unknown) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Jeu introuvable'
    toast.add({ title: 'Erreur', description: message, color: 'error' })
    data.value = null
  } finally {
    loading.value = false
  }
}

async function toggleCompletion() {
  if (!data.value) return
  updatingCompletion.value = true
  try {
    const result = await $fetch<{ isCompleted: boolean, completedAt: string | null }>(
      `/api/library/games/${gameId.value}/completion`,
      { method: 'PATCH', body: { isCompleted: !data.value.game.isCompleted } }
    )
    data.value.game.isCompleted = result.isCompleted
    data.value.game.completedAt = result.completedAt
    toast.add({
      title: result.isCompleted ? 'Marqué comme terminé' : 'Marqué comme non terminé',
      color: 'success'
    })
  } catch {
    toast.add({ title: 'Erreur', description: 'Impossible de modifier le statut', color: 'error' })
  } finally {
    updatingCompletion.value = false
  }
}

function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining > 0 ? `${h}h ${remaining}min` : `${h}h`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const PLATFORM_LABEL: Record<string, string> = {
  steam: 'Steam',
  playstation: 'PlayStation',
  xbox: 'Xbox'
}

const PLATFORM_ICONS: Record<string, string> = {
  steam: 'i-simple-icons-steam',
  playstation: 'i-simple-icons-playstation',
  xbox: 'i-simple-icons-xbox'
}

const PLATFORM_ASPECT: Record<string, string> = {
  steam: '460/215',
  playstation: '1/1',
  xbox: '16/9'
}

const filteredAchievements = computed(() => {
  if (!data.value) return []
  const q = filterQuery.value.trim().toLowerCase()
  return data.value.achievements.filter((a) => {
    if (!showLocked.value && !a.isUnlocked) return false
    if (q && !a.name.toLowerCase().includes(q) && !a.description?.toLowerCase().includes(q)) return false
    return true
  })
})

onMounted(load)
</script>

<template>
  <div>
    <UButton
      label="Retour à la bibliothèque"
      icon="i-lucide-arrow-left"
      variant="ghost"
      color="neutral"
      size="sm"
      :to="friendUserId ? `/library/friend/${friendUserId}` : '/library'"
      class="mb-4"
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
      v-else-if="!data"
      class="text-center py-12 text-muted"
    >
      Jeu introuvable.
    </div>

    <div
      v-else
      class="space-y-6"
    >
      <!-- Header: cover + info -->
      <div class="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        <div
          class="rounded-lg border border-default bg-elevated overflow-hidden"
          :style="{ aspectRatio: PLATFORM_ASPECT[data.game.account.platform] ?? '460/215' }"
        >
          <img
            v-if="data.game.coverUrl"
            :src="data.game.coverUrl"
            :alt="data.game.name"
            class="w-full h-full object-cover"
          >
          <div
            v-else
            class="w-full h-full flex items-center justify-center text-4xl font-bold text-violet-500/40"
          >
            {{ data.game.name.charAt(0) }}
          </div>
        </div>

        <div class="min-w-0">
          <div class="flex items-center gap-2 text-xs text-muted mb-2">
            <UIcon
              :name="PLATFORM_ICONS[data.game.account.platform]"
              class="size-4"
            />
            {{ PLATFORM_LABEL[data.game.account.platform] }}
            <template v-if="data.game.account.username || data.game.account.displayName">
              · {{ data.game.account.displayName ?? data.game.account.username }}
            </template>
          </div>
          <h1 class="text-2xl font-bold mb-3">
            {{ data.game.name }}
          </h1>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div class="rounded-md border border-default bg-default p-3">
              <p class="text-[10px] text-muted uppercase tracking-wider">
                Temps de jeu
              </p>
              <p class="text-lg font-bold mt-0.5">
                {{ formatPlaytime(data.game.playtimeTotal) }}
              </p>
            </div>
            <div class="rounded-md border border-default bg-default p-3">
              <p class="text-[10px] text-muted uppercase tracking-wider">
                Succès
              </p>
              <p class="text-lg font-bold mt-0.5">
                {{ data.stats.unlockedAchievements }}<span class="text-sm text-muted">/{{ data.stats.totalAchievements }}</span>
              </p>
            </div>
            <div class="rounded-md border border-default bg-default p-3">
              <p class="text-[10px] text-muted uppercase tracking-wider">
                Complétion
              </p>
              <p class="text-lg font-bold mt-0.5">
                {{ data.stats.completionPercentage }}%
              </p>
            </div>
            <div class="rounded-md border border-default bg-default p-3">
              <p class="text-[10px] text-muted uppercase tracking-wider">
                Dernier jeu
              </p>
              <p class="text-lg font-bold mt-0.5">
                {{ formatDate(data.game.lastPlayed) }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <UButton
              v-if="data.isOwnGame"
              :label="data.game.isCompleted ? 'Marquer non terminé' : 'Marquer terminé'"
              :icon="data.game.isCompleted ? 'i-lucide-circle-x' : 'i-lucide-check-circle'"
              :color="data.game.isCompleted ? 'neutral' : 'primary'"
              :variant="data.game.isCompleted ? 'outline' : 'solid'"
              :loading="updatingCompletion"
              size="sm"
              @click="toggleCompletion"
            />
            <UBadge
              v-if="data.game.isCompleted"
              color="success"
              variant="subtle"
              :label="`Terminé le ${formatDate(data.game.completedAt)}`"
              icon="i-lucide-trophy"
            />
            <UButton
              v-if="data.game.account.profileUrl"
              :to="data.game.account.profileUrl"
              external
              target="_blank"
              label="Profil plateforme"
              icon="i-lucide-external-link"
              variant="outline"
              color="neutral"
              size="sm"
            />
          </div>
        </div>
      </div>

      <!-- Achievements -->
      <div v-if="data.stats.totalAchievements > 0">
        <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 class="text-lg font-semibold">
            Succès
          </h2>
          <div class="flex items-center gap-2">
            <UInput
              v-model="filterQuery"
              placeholder="Rechercher..."
              icon="i-lucide-search"
              size="sm"
            />
            <UButton
              :label="showLocked ? 'Masquer verrouillés' : 'Tout afficher'"
              :icon="showLocked ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              variant="outline"
              color="neutral"
              size="sm"
              @click="showLocked = !showLocked"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <div
            v-for="ach in filteredAchievements"
            :key="ach.id"
            class="flex items-center gap-3 p-2.5 rounded-md border border-default bg-default"
            :class="{ 'opacity-50': !ach.isUnlocked }"
          >
            <div class="size-10 shrink-0 rounded bg-elevated overflow-hidden flex items-center justify-center">
              <img
                v-if="ach.iconUrl"
                :src="ach.iconUrl"
                :alt="ach.name"
                class="w-full h-full object-cover"
                :class="{ grayscale: !ach.isUnlocked }"
              >
              <UIcon
                v-else
                name="i-lucide-trophy"
                class="size-5 text-muted"
              />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">
                {{ ach.name }}
              </p>
              <p
                v-if="ach.description"
                class="text-xs text-muted truncate"
                :title="ach.description"
              >
                {{ ach.description }}
              </p>
            </div>
            <div class="text-right text-xs shrink-0">
              <p
                v-if="ach.isUnlocked && ach.unlockedAt"
                class="text-violet-500"
              >
                {{ formatDate(ach.unlockedAt) }}
              </p>
              <p
                v-else-if="!ach.isUnlocked"
                class="text-muted"
              >
                Verrouillé
              </p>
              <p
                v-if="ach.earnedRate != null"
                class="text-muted"
              >
                {{ ach.earnedRate.toFixed(1) }}%
              </p>
              <p
                v-if="ach.points"
                class="text-muted"
              >
                {{ ach.points }} pts
              </p>
            </div>
          </div>

          <p
            v-if="filteredAchievements.length === 0"
            class="text-center py-6 text-sm text-muted"
          >
            Aucun succès ne correspond aux filtres.
          </p>
        </div>
      </div>

      <p
        v-else
        class="text-sm text-muted"
      >
        Aucun succès synchronisé pour ce jeu.
      </p>
    </div>
  </div>
</template>
