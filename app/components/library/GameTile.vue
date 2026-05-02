<script setup lang="ts">
interface Game {
  id: string
  name: string
  iconUrl: string | null
  coverUrl: string | null
  playtimeTotal: number
  lastPlayed?: string | Date | null
  completedAt?: string | Date | null
  isCompleted?: boolean
  platform: 'steam' | 'playstation' | 'xbox'
  totalAchievements?: number
  unlockedAchievements?: number
  achievementPercentage?: number
}

defineProps<{
  game: Game
  // Override the secondary line (default = playtime).
  caption?: string
}>()

const PLATFORM_ICONS: Record<string, string> = {
  steam: 'i-simple-icons-steam',
  playstation: 'i-simple-icons-playstation',
  xbox: 'i-simple-icons-xbox'
}

// Steam covers (header.jpg) are 460×215 paysage, PSN icons are 1:1, Xbox displayImage is ~16:9.
// One ratio doesn't fit all — use platform to pick.
const PLATFORM_ASPECT: Record<string, string> = {
  steam: '460/215',
  playstation: '1/1',
  xbox: '16/9'
}

function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  return h < 1000 ? `${h}h` : `${(h / 1000).toFixed(1)}k h`
}
</script>

<template>
  <NuxtLink
    :to="`/library/games/${game.id}`"
    class="group block rounded-lg border border-default bg-default overflow-hidden transition-colors hover:border-violet-500/50"
  >
    <div
      class="relative bg-elevated"
      :style="{ aspectRatio: PLATFORM_ASPECT[game.platform] ?? '460/215' }"
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
      <div class="absolute top-1.5 left-1.5 size-6 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
        <UIcon
          :name="PLATFORM_ICONS[game.platform] ?? 'i-lucide-gamepad-2'"
          class="size-3.5 text-white"
        />
      </div>
      <div
        v-if="game.isCompleted"
        class="absolute top-1.5 right-1.5 size-6 rounded-full bg-violet-500 flex items-center justify-center"
        title="Terminé"
      >
        <UIcon
          name="i-lucide-check"
          class="size-3.5 text-white"
        />
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
        {{ caption ?? formatPlaytime(game.playtimeTotal) }}
      </p>
      <div
        v-if="game.totalAchievements && game.totalAchievements > 0"
        class="mt-1 flex items-center gap-1 text-[10px] text-muted"
      >
        <UIcon
          name="i-lucide-trophy"
          class="size-3"
        />
        <span>{{ game.unlockedAchievements ?? 0 }}/{{ game.totalAchievements }}</span>
        <span class="text-violet-500/80">· {{ game.achievementPercentage ?? 0 }}%</span>
      </div>
    </div>
  </NuxtLink>
</template>
