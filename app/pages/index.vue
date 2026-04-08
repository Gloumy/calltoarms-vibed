<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { user } = useAuth()
const { on } = useWebSocket()

const sessions = ref<any[]>([])
const loadingSessions = ref(true)
const showCreateModal = ref(false)

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
  fetchAvailability()

  // Listen for realtime updates
  on('session:update', () => fetchSessions())
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
        <!-- Availability toggle -->
        <UButton
          :label="isAvailable ? 'Indisponible' : 'Disponible'"
          :icon="isAvailable ? 'i-lucide-circle-off' : 'i-lucide-circle-check'"
          :variant="isAvailable ? 'solid' : 'outline'"
          :color="isAvailable ? 'success' : 'neutral'"
          size="sm"
          :loading="togglingAvailability"
          @click="toggleAvailability"
        />

        <!-- Create session -->
        <UButton
          label="Lancer une session"
          icon="i-lucide-rocket"
          size="sm"
          @click="showCreateModal = true"
        />
      </div>
    </div>

    <!-- Sessions feed -->
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

    <!-- Create modal -->
    <SessionCreateModal
      v-model:open="showCreateModal"
      @created="onSessionCreated"
    />
  </div>
</template>
