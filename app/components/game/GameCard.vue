<script setup lang="ts">
const props = defineProps<{
  game: {
    id: number
    name: string
    slug: string | null
    coverUrl: string | null
    summary: string | null
    genres: string[] | null
    platforms: string[] | null
    firstReleaseDate: number | null
  }
  favorited: boolean
}>()

const emit = defineEmits<{
  toggleFavorite: [gameId: number]
}>()

const toggling = ref(false)

async function toggleFavorite() {
  toggling.value = true
  try {
    if (props.favorited) {
      await $fetch('/api/games/favorites', {
        method: 'DELETE',
        body: { gameId: props.game.id }
      })
    } else {
      await $fetch('/api/games/favorites', {
        method: 'POST',
        body: { gameId: props.game.id }
      })
    }
    emit('toggleFavorite', props.game.id)
  } catch {
    // silently handled
  } finally {
    toggling.value = false
  }
}

const releaseYear = computed(() => {
  if (!props.game.firstReleaseDate) return null
  return new Date(props.game.firstReleaseDate * 1000).getFullYear()
})
</script>

<template>
  <div class="group rounded-lg border border-default bg-default overflow-hidden transition-colors hover:border-violet-500/50">
    <!-- Cover -->
    <div class="relative aspect-[3/4] bg-elevated">
      <img
        v-if="game.coverUrl"
        :src="game.coverUrl"
        :alt="game.name"
        class="w-full h-full object-cover"
      >
      <div
        v-else
        class="w-full h-full flex items-center justify-center text-3xl font-bold text-violet-500/40"
      >
        {{ game.name.charAt(0) }}
      </div>

      <!-- Favorite button overlay -->
      <button
        type="button"
        class="absolute top-2 right-2 size-8 rounded-full flex items-center justify-center transition-all"
        :class="favorited
          ? 'bg-violet-500 text-white'
          : 'bg-black/50 text-white opacity-0 group-hover:opacity-100'"
        :disabled="toggling"
        @click.stop="toggleFavorite"
      >
        <UIcon
          :name="favorited ? 'i-lucide-heart' : 'i-lucide-heart'"
          class="size-4"
          :class="favorited ? 'fill-current' : ''"
        />
      </button>
    </div>

    <!-- Info -->
    <div class="p-3">
      <h3
        class="text-sm font-semibold truncate"
        :title="game.name"
      >
        {{ game.name }}
      </h3>
      <p
        v-if="game.genres?.length || releaseYear"
        class="text-xs text-muted truncate mt-0.5"
      >
        <span v-if="releaseYear">{{ releaseYear }}</span>
        <span
          v-if="releaseYear && game.genres?.length"
          class="mx-1"
        >&middot;</span>
        <span v-if="game.genres?.length">{{ game.genres.slice(0, 2).join(', ') }}</span>
      </p>
    </div>
  </div>
</template>
