<script setup lang="ts">
import type { ComparisonResponse, ComparisonSideStats } from '~/types/activity'

const props = defineProps<{
  open: boolean
  gameId: number | null
  friendId: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const data = ref<ComparisonResponse | null>(null)
const loading = ref(false)
const error = ref('')

watch(() => props.open, async (open) => {
  if (!open) {
    data.value = null
    error.value = ''
    return
  }
  if (props.gameId == null || !props.friendId) return
  loading.value = true
  error.value = ''
  try {
    data.value = await $fetch<ComparisonResponse>(
      `/api/activity/games/${props.gameId}/compare/${props.friendId}`
    )
  } catch (e: unknown) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Impossible de charger la comparaison'
  } finally {
    loading.value = false
  }
})

function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return hours < 1000 ? `${hours} h` : `${(hours / 1000).toFixed(1)}k h`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface DeltaInfo {
  label: string
  color: string
  icon: string
}

function deltaPlaytime(meSide: ComparisonSideStats | null | undefined, otherSide: ComparisonSideStats): DeltaInfo {
  if (!meSide) return { label: '—', color: 'text-muted', icon: 'i-lucide-minus' }
  const diff = meSide.playtimeTotal - otherSide.playtimeTotal
  if (diff === 0) return { label: 'Égal', color: 'text-muted', icon: 'i-lucide-equal' }
  const abs = formatPlaytime(Math.abs(diff))
  return diff > 0
    ? { label: `+${abs}`, color: 'text-emerald-500', icon: 'i-lucide-arrow-up' }
    : { label: `-${abs}`, color: 'text-amber-500', icon: 'i-lucide-arrow-down' }
}

function deltaPercent(meSide: ComparisonSideStats | null | undefined, otherSide: ComparisonSideStats): DeltaInfo {
  if (!meSide || meSide.achievementsTotal === 0 || otherSide.achievementsTotal === 0) {
    return { label: '—', color: 'text-muted', icon: 'i-lucide-minus' }
  }
  const diff = meSide.achievementPercentage - otherSide.achievementPercentage
  if (diff === 0) return { label: 'Égal', color: 'text-muted', icon: 'i-lucide-equal' }
  return diff > 0
    ? { label: `+${diff} pts`, color: 'text-emerald-500', icon: 'i-lucide-arrow-up' }
    : { label: `${diff} pts`, color: 'text-amber-500', icon: 'i-lucide-arrow-down' }
}
</script>

<template>
  <UModal
    :open="props.open"
    @update:open="emit('update:open', $event)"
  >
    <template #header>
      <h3 class="text-lg font-semibold">
        Comparaison
      </h3>
    </template>

    <template #body>
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
        v-else-if="error"
        class="text-center py-8"
      >
        <UIcon
          name="i-lucide-alert-circle"
          class="size-8 text-warning mx-auto mb-2"
        />
        <p class="text-sm text-muted">
          {{ error }}
        </p>
      </div>

      <div
        v-else-if="data"
        class="space-y-4"
      >
        <!-- Game header -->
        <div class="flex items-center gap-3 pb-3 border-b border-default">
          <img
            v-if="data.game.coverUrl"
            :src="data.game.coverUrl"
            :alt="data.game.name"
            class="h-16 w-auto rounded object-cover"
          >
          <h4 class="text-base font-semibold">
            {{ data.game.name }}
          </h4>
        </div>

        <!-- Side-by-side -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Me -->
          <div class="rounded-lg border border-default p-3">
            <p class="text-xs text-muted uppercase tracking-wider mb-2">
              Moi
            </p>
            <template v-if="data.me.hasGame && data.me.stats">
              <p class="text-xs text-muted">
                Temps de jeu
              </p>
              <p class="text-lg font-semibold">
                {{ formatPlaytime(data.me.stats.playtimeTotal) }}
              </p>
              <p class="text-xs text-muted mt-2">
                Succès
              </p>
              <p class="text-lg font-semibold">
                <template v-if="data.me.stats.achievementsTotal > 0">
                  {{ data.me.stats.achievementsUnlocked }}/{{ data.me.stats.achievementsTotal }}
                  <span class="text-sm text-muted">
                    ({{ data.me.stats.achievementPercentage }}%)
                  </span>
                </template>
                <template v-else>
                  —
                </template>
              </p>
              <p class="text-xs text-muted mt-2">
                Dernière partie
              </p>
              <p class="text-sm">
                {{ formatDate(data.me.stats.lastPlayed) }}
              </p>
              <UBadge
                v-if="data.me.stats.isCompleted"
                color="success"
                variant="subtle"
                size="xs"
                class="mt-2"
              >
                <UIcon
                  name="i-lucide-check"
                  class="size-3 mr-1"
                />
                Terminé
              </UBadge>
            </template>
            <p
              v-else
              class="text-sm text-muted italic"
            >
              Tu ne possèdes pas ce jeu
            </p>
          </div>

          <!-- Friend -->
          <div class="rounded-lg border border-default p-3">
            <div class="flex items-center gap-2 mb-2">
              <UAvatar
                :src="data.friend.image ?? undefined"
                :alt="data.friend.username"
                size="xs"
              />
              <p class="text-xs text-muted uppercase tracking-wider truncate">
                {{ data.friend.username }}
              </p>
            </div>
            <p class="text-xs text-muted">
              Temps de jeu
            </p>
            <p class="text-lg font-semibold">
              {{ formatPlaytime(data.friend.stats.playtimeTotal) }}
            </p>
            <p class="text-xs text-muted mt-2">
              Succès
            </p>
            <p class="text-lg font-semibold">
              <template v-if="data.friend.stats.achievementsTotal > 0">
                {{ data.friend.stats.achievementsUnlocked }}/{{ data.friend.stats.achievementsTotal }}
                <span class="text-sm text-muted">
                  ({{ data.friend.stats.achievementPercentage }}%)
                </span>
              </template>
              <template v-else>
                —
              </template>
            </p>
            <p class="text-xs text-muted mt-2">
              Dernière partie
            </p>
            <p class="text-sm">
              {{ formatDate(data.friend.stats.lastPlayed) }}
            </p>
            <UBadge
              v-if="data.friend.stats.isCompleted"
              color="success"
              variant="subtle"
              size="xs"
              class="mt-2"
            >
              <UIcon
                name="i-lucide-check"
                class="size-3 mr-1"
              />
              Terminé
            </UBadge>
          </div>
        </div>

        <!-- Deltas -->
        <div
          v-if="data.me.hasGame && data.me.stats"
          class="rounded-lg bg-elevated/50 p-3 space-y-2"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-muted">Temps de jeu</span>
            <span :class="['text-sm font-medium flex items-center gap-1', deltaPlaytime(data.me.stats, data.friend.stats).color]">
              <UIcon
                :name="deltaPlaytime(data.me.stats, data.friend.stats).icon"
                class="size-3.5"
              />
              {{ deltaPlaytime(data.me.stats, data.friend.stats).label }}
            </span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-muted">Succès</span>
            <span :class="['text-sm font-medium flex items-center gap-1', deltaPercent(data.me.stats, data.friend.stats).color]">
              <UIcon
                :name="deltaPercent(data.me.stats, data.friend.stats).icon"
                class="size-3.5"
              />
              {{ deltaPercent(data.me.stats, data.friend.stats).label }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
