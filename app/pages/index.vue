<script setup lang="ts">
import type { ActivityItem, ActivityResponse, ActivityStats } from '~/types/activity'

definePageMeta({
  layout: 'default'
})

const toast = useToast()
const ws = useWebSocket()

// ── Live: sessions + upcoming events ────────────────────────────────────────
const sessions = ref<any[]>([])
const upcomingEvents = ref<any[]>([])
const loadingLive = ref(true)
const showCreateModal = ref(false)

// ── Availability ────────────────────────────────────────────────────────────
const isAvailable = ref(false)
const togglingAvailability = ref(false)

// ── Activity feed ───────────────────────────────────────────────────────────
type Tab = 'all' | 'sessions' | 'events' | 'games'
const stats = ref<ActivityStats | null>(null)
const items = ref<ActivityItem[]>([])
const loadingActivity = ref(true)
const loadingMore = ref(false)
const nextCursor = ref<string | null>(null)
const activeTab = ref<Tab>('all')

const comparisonOpen = ref(false)
const comparisonGameId = ref<number | null>(null)
const comparisonFriendId = ref<string | null>(null)

const tabs: Array<{ value: Tab, label: string, icon: string }> = [
  { value: 'all', label: 'Tout', icon: 'i-lucide-activity' },
  { value: 'sessions', label: 'Sessions', icon: 'i-lucide-gamepad-2' },
  { value: 'events', label: 'Événements', icon: 'i-lucide-calendar' },
  { value: 'games', label: 'Jeux', icon: 'i-lucide-trophy' }
]

// Dedup: a session shown in "En direct" should not also appear as a
// session_started entry in the feed below.
const liveSessionIds = computed(() => new Set(sessions.value.map(s => s.id)))

const filteredItems = computed(() =>
  items.value.filter(
    i => !(i.type === 'session_started' && i.sessionId && liveSessionIds.value.has(i.sessionId))
  )
)

interface Bucket {
  key: string
  label: string
  items: ActivityItem[]
}

const groupedItems = computed<Bucket[]>(() => {
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startYesterday = startToday - 24 * 60 * 60 * 1000
  const startWeek = startToday - 7 * 24 * 60 * 60 * 1000

  const buckets: Record<string, Bucket> = {
    today: { key: 'today', label: 'Aujourd\'hui', items: [] },
    yesterday: { key: 'yesterday', label: 'Hier', items: [] },
    week: { key: 'week', label: 'Cette semaine', items: [] },
    older: { key: 'older', label: 'Plus ancien', items: [] }
  }

  for (const item of filteredItems.value) {
    const t = new Date(item.timestamp).getTime()
    if (t >= startToday) buckets.today!.items.push(item)
    else if (t >= startYesterday) buckets.yesterday!.items.push(item)
    else if (t >= startWeek) buckets.week!.items.push(item)
    else buckets.older!.items.push(item)
  }

  return Object.values(buckets).filter(b => b.items.length > 0)
})

// ── Fetchers ────────────────────────────────────────────────────────────────
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
    sessions.value = await $fetch<unknown[]>('/api/sessions') as typeof sessions.value
  } catch {
    sessions.value = []
  }
}

async function fetchEvents() {
  try {
    const data = await $fetch<any[]>('/api/events')
    upcomingEvents.value = data.slice(0, 6)
  } catch {
    upcomingEvents.value = []
  }
}

async function fetchLive() {
  loadingLive.value = true
  try {
    await Promise.all([fetchSessions(), fetchEvents()])
  } finally {
    loadingLive.value = false
  }
}

async function loadActivity(reset: boolean = true) {
  if (reset) {
    loadingActivity.value = true
    items.value = []
    nextCursor.value = null
  }
  try {
    const res = await $fetch<ActivityResponse>('/api/activity', {
      query: { type: activeTab.value }
    })
    if (res.stats) stats.value = res.stats
    items.value = res.items
    nextCursor.value = res.nextCursor
  } catch {
    toast.add({ title: 'Erreur', description: 'Impossible de charger l\'activité', color: 'error' })
  } finally {
    loadingActivity.value = false
  }
}

async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const res = await $fetch<ActivityResponse>('/api/activity', {
      query: { type: activeTab.value, before: nextCursor.value }
    })
    items.value.push(...res.items)
    nextCursor.value = res.nextCursor
  } catch {
    toast.add({ title: 'Erreur', description: 'Impossible de charger plus d\'activité', color: 'error' })
  } finally {
    loadingMore.value = false
  }
}

async function refreshHead() {
  try {
    const res = await $fetch<ActivityResponse>('/api/activity', {
      query: { type: activeTab.value }
    })
    if (res.stats) stats.value = res.stats
    const seen = new Set(items.value.map(i => i.id))
    const newItems = res.items.filter(i => !seen.has(i.id))
    if (newItems.length > 0) items.value = [...newItems, ...items.value]
  } catch {
    // ignore — next refresh will catch up
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
  refreshHead()
}

function onCompare(payload: { gameId: number, friendId: string }) {
  comparisonGameId.value = payload.gameId
  comparisonFriendId.value = payload.friendId
  comparisonOpen.value = true
}

watch(activeTab, () => loadActivity(true))

const cleanups: Array<() => void> = []

onMounted(() => {
  fetchLive()
  fetchAvailability()
  loadActivity(true)

  cleanups.push(ws.on('session:update', () => {
    fetchSessions()
    refreshHead()
  }))
  cleanups.push(ws.on('event:update', () => {
    fetchEvents()
    refreshHead()
  }))
  cleanups.push(ws.on('availability:update', refreshHead))
})

onUnmounted(() => {
  for (const cleanup of cleanups) cleanup()
})
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <NotificationsCallout />

    <!-- Sticky action bar -->
    <div class="sticky top-0 z-20 -mx-3 sm:-mx-6 px-3 sm:px-6 py-3 bg-default/80 backdrop-blur border-b border-default flex flex-wrap items-center justify-between gap-3 mb-6">
      <h1 class="text-xl font-bold">
        Accueil
      </h1>
      <div class="flex items-center gap-2 flex-wrap">
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

    <!-- En direct -->
    <section
      v-if="loadingLive || sessions.length > 0 || upcomingEvents.length > 0"
      class="mb-8"
    >
      <h2 class="text-xs font-semibold uppercase text-muted tracking-wider mb-3">
        En direct
      </h2>

      <div
        v-if="loadingLive"
        class="flex items-center justify-center py-8"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="size-5 animate-spin text-muted"
        />
      </div>

      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
      >
        <SessionCard
          v-for="s in sessions"
          :key="`session-${s.id}`"
          :session="s"
          @refresh="fetchSessions"
        />
        <EventCard
          v-for="e in upcomingEvents"
          :key="`event-${e.id}`"
          :event="e"
        />
      </div>
    </section>

    <!-- Empty state for "live" when nothing is happening -->
    <div
      v-else-if="!loadingLive"
      class="mb-8 text-center py-8 border border-dashed border-default rounded-lg"
    >
      <UIcon
        name="i-lucide-gamepad-2"
        class="size-10 text-muted mx-auto mb-2"
      />
      <p class="text-sm text-muted">
        Rien en direct pour l'instant.
      </p>
      <UButton
        label="Lancer la première session"
        icon="i-lucide-rocket"
        size="sm"
        class="mt-3"
        @click="showCreateModal = true"
      />
    </div>

    <!-- Activity feed -->
    <section>
      <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 class="text-xs font-semibold uppercase text-muted tracking-wider">
          Activité
        </h2>
        <UButton
          label="Actualiser"
          icon="i-lucide-refresh-cw"
          variant="ghost"
          color="neutral"
          size="xs"
          :loading="loadingActivity"
          @click="loadActivity(true)"
        />
      </div>

      <div
        v-if="stats"
        class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4"
      >
        <div class="rounded-lg border border-default bg-elevated/40 px-3 py-2.5 flex items-center gap-3">
          <UIcon
            name="i-lucide-users"
            class="size-5 text-violet-500 shrink-0"
          />
          <div class="min-w-0">
            <p class="text-xl font-bold leading-none">
              {{ stats.totalFriends }}
            </p>
            <p class="text-[11px] text-muted mt-1 truncate">
              Amis
            </p>
          </div>
        </div>
        <div class="rounded-lg border border-default bg-elevated/40 px-3 py-2.5 flex items-center gap-3">
          <UIcon
            name="i-lucide-zap"
            class="size-5 text-emerald-500 shrink-0"
          />
          <div class="min-w-0">
            <p class="text-xl font-bold leading-none">
              {{ stats.activeThisWeek }}
            </p>
            <p class="text-[11px] text-muted mt-1 truncate">
              Actifs cette semaine
            </p>
          </div>
        </div>
        <div class="rounded-lg border border-default bg-elevated/40 px-3 py-2.5 flex items-center gap-3">
          <UIcon
            name="i-lucide-library"
            class="size-5 text-blue-500 shrink-0"
          />
          <div class="min-w-0">
            <p class="text-xl font-bold leading-none">
              {{ stats.totalGamesInCircle }}
            </p>
            <p class="text-[11px] text-muted mt-1 truncate">
              Jeux dans le cercle
            </p>
          </div>
        </div>
        <div class="rounded-lg border border-default bg-elevated/40 px-3 py-2.5 flex items-center gap-3">
          <UIcon
            name="i-lucide-link"
            class="size-5 text-amber-500 shrink-0"
          />
          <div class="min-w-0">
            <p class="text-xl font-bold leading-none">
              {{ stats.commonGames }}
            </p>
            <p class="text-[11px] text-muted mt-1 truncate">
              Jeux en commun
            </p>
          </div>
        </div>
      </div>

      <UTabs
        v-model="activeTab"
        :items="tabs"
        class="mb-4"
      />

      <div
        v-if="loadingActivity"
        class="flex items-center justify-center py-12"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="size-6 animate-spin text-muted"
        />
      </div>

      <div
        v-else-if="groupedItems.length === 0"
        class="text-center py-12"
      >
        <UIcon
          name="i-lucide-activity"
          class="size-10 text-muted mx-auto mb-3"
        />
        <p class="text-sm text-muted">
          Aucune activité récente.
        </p>
      </div>

      <div
        v-else
        class="space-y-6"
      >
        <div
          v-for="bucket in groupedItems"
          :key="bucket.key"
        >
          <h3 class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            {{ bucket.label }}
          </h3>
          <ul class="space-y-2">
            <li
              v-for="item in bucket.items"
              :key="item.id"
            >
              <ActivityCard
                :item="item"
                @compare="onCompare"
              />
            </li>
          </ul>
        </div>

        <div
          v-if="nextCursor"
          class="flex justify-center pt-4"
        >
          <UButton
            label="Charger plus"
            icon="i-lucide-chevron-down"
            variant="outline"
            color="neutral"
            size="sm"
            :loading="loadingMore"
            @click="loadMore"
          />
        </div>
      </div>
    </section>

    <!-- Create session modal -->
    <SessionCreateModal
      v-model:open="showCreateModal"
      @created="onSessionCreated"
    />

    <!-- Comparison modal -->
    <GameComparisonModal
      v-model:open="comparisonOpen"
      :game-id="comparisonGameId"
      :friend-id="comparisonFriendId"
    />
  </div>
</template>
