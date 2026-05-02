<script setup lang="ts">
const props = defineProps<{
  modelValue: any | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any | null]
}>()

const query = ref('')
const { results, loading, search, clear } = useGameSearch()
const showDropdown = ref(false)

function onInput(value: string) {
  query.value = value
  if (value.length >= 2) {
    showDropdown.value = true
    search(value)
  } else {
    showDropdown.value = false
    clear()
  }
}

function selectGame(game: any) {
  emit('update:modelValue', game)
  query.value = game.name
  showDropdown.value = false
  clear()
}

function clearSelection() {
  emit('update:modelValue', null)
  query.value = ''
  showDropdown.value = false
  clear()
}

// Close dropdown on click outside
function onBlur() {
  setTimeout(() => {
    showDropdown.value = false
  }, 200)
}
</script>

<template>
  <div class="relative">
    <UInput
      :model-value="query"
      placeholder="Rechercher un jeu..."
      icon="i-lucide-search"
      :loading="loading"
      class="w-full"
      @update:model-value="onInput"
      @blur="onBlur"
      @focus="query.length >= 2 && results.length > 0 && (showDropdown = true)"
    />

    <!-- Clear button when game selected -->
    <button
      v-if="props.modelValue"
      class="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-default"
      type="button"
      @click="clearSelection"
    >
      <UIcon
        name="i-lucide-x"
        class="size-4"
      />
    </button>

    <!-- Dropdown results -->
    <div
      v-if="showDropdown && results.length > 0"
      class="absolute z-50 mt-1 w-full rounded-md border border-default bg-default shadow-lg max-h-60 overflow-y-auto"
    >
      <button
        v-for="game in results"
        :key="game.id"
        type="button"
        class="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-elevated transition-colors"
        @mousedown.prevent="selectGame(game)"
      >
        <img
          v-if="game.coverUrl"
          :src="game.coverUrl"
          :alt="game.name"
          class="w-8 h-10 rounded object-cover shrink-0"
        >
        <div
          v-else
          class="w-8 h-10 rounded bg-violet-500/20 text-violet-500 flex items-center justify-center text-xs font-bold shrink-0"
        >
          {{ game.name?.charAt(0) }}
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium truncate">
            {{ game.name }}
          </p>
          <p
            v-if="game.genres?.length"
            class="text-xs text-muted truncate"
          >
            {{ game.genres.slice(0, 3).join(', ') }}
          </p>
        </div>
      </button>
    </div>

    <!-- No results -->
    <div
      v-if="showDropdown && !loading && query.length >= 2 && results.length === 0"
      class="absolute z-50 mt-1 w-full rounded-md border border-default bg-default shadow-lg p-3 text-sm text-muted"
    >
      Aucun jeu trouve
    </div>
  </div>
</template>
