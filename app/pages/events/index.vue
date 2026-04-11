<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const events = ref<any[]>([])
const loading = ref(true)
const showCreateModal = ref(false)

async function fetchEvents() {
  try {
    events.value = await $fetch('/api/events')
  } catch {
    events.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchEvents()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">
        Evenements
      </h1>
      <UButton
        label="Creer un evenement"
        icon="i-lucide-calendar-plus"
        size="sm"
        @click="showCreateModal = true"
      />
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
    </div>

    <div v-else-if="events.length === 0" class="text-center py-12">
      <UIcon name="i-lucide-calendar" class="size-12 text-muted mx-auto mb-3" />
      <p class="text-muted mb-4">
        Aucun evenement a venir.
      </p>
      <UButton
        label="Creer le premier"
        icon="i-lucide-calendar-plus"
        @click="showCreateModal = true"
      />
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
      <EventCard
        v-for="e in events"
        :key="e.id"
        :event="e"
      />
    </div>

    <EventCreateModal
      v-model:open="showCreateModal"
      @created="fetchEvents()"
    />
  </div>
</template>
