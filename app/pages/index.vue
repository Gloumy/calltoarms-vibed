<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { user } = useAuth()
const { on } = useWebSocket()

const sessions = ref<any[]>([])
const loadingSessions = ref(true)
const showCreateModal = ref(false)

const upcomingEvents = ref<any[]>([])
const loadingEvents = ref(true)

// Availability state
const isAvailable = ref(false)
const togglingAvailability = ref(false)

async function fetchAvailability() {
  try {
    const data = await $fetch<any>('/api/users/availability')
    isAvailable.value = data.available
  } catch {
    isAvailable.value = false
  }
}

async function fetchSessions() {
  try {
    sessions.value = await $fetch('/api/sessions')
  } catch {
    sessions.value = []
  } finally {
    loadingSessions.value = false
  }
}

async function fetchEvents() {
  try {
    const data = await $fetch<any[]>('/api/events')
    // Show max 5 upcoming events
    upcomingEvents.value = data.slice(0, 5)
  } catch {
    upcomingEvents.value = []
  } finally {
    loadingEvents.value = false
  }
}

async function toggleAvailability() {
  togglingAvailability.value = true
  try {
    await $fetch('/api/users/availability', {
      method: 'POST',
      body: isAvailable.value ? { clear: true } : { durationMinutes: 120 }
    })
    isAvailable.value = !isAvailable.value
  } catch {
    // silently handled
  } finally {
    togglingAvailability.value = false
  }
}

function onSessionCreated() {
  fetchSessions()
}

onMounted(() => {
  fetchSessions()
  fetchEvents()
  fetchAvailability()

  on('session:update', () => fetchSessions())
  on('event:update', () => fetchEvents())
})
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">
        Dashboard
      </h1>

      <div class="flex items-center gap-3">
        <UButton
          :label="isAvailable ? 'Indisponible' : 'Disponible'"
          :icon="isAvailable ? 'i-lucide-circle-off' : 'i-lucide-circle-check'"
          :variant="isAvailable ? 'solid' : 'outline'"
          :color="isAvailable ? 'success' : 'neutral'"
          size="sm"
          :loading="togglingAvailability"
          @click="toggleAvailability"
        />
        <UButton
          label="Lancer une session"
          icon="i-lucide-rocket"
          size="sm"
          @click="showCreateModal = true"
        />
      </div>
    </div>

    <!-- Upcoming events -->
    <div v-if="!loadingEvents && upcomingEvents.length > 0" class="mb-8">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-muted uppercase tracking-wider">
          Evenements a venir
        </h2>
        <NuxtLink to="/events" class="text-xs text-violet-500 hover:underline">
          Voir tout
        </NuxtLink>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
        <EventCard
          v-for="e in upcomingEvents"
          :key="e.id"
          :event="e"
        />
      </div>
    </div>

    <!-- Sessions -->
    <div>
      <h2 v-if="upcomingEvents.length > 0" class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
        Sessions actives
      </h2>

      <div v-if="loadingSessions" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
      </div>

      <div v-else-if="sessions.length === 0" class="text-center py-12">
        <UIcon name="i-lucide-gamepad-2" class="size-12 text-muted mx-auto mb-3" />
        <p class="text-muted mb-4">
          Aucune session active pour le moment.
        </p>
        <UButton
          label="Lancer la premiere session"
          icon="i-lucide-rocket"
          @click="showCreateModal = true"
        />
      </div>

      <div v-else class="space-y-3">
        <SessionCard
          v-for="s in sessions"
          :key="s.id"
          :session="s"
          @refresh="fetchSessions"
        />
      </div>
    </div>

    <!-- Create session modal -->
    <SessionCreateModal
      v-model:open="showCreateModal"
      @created="onSessionCreated"
    />
  </div>
</template>
