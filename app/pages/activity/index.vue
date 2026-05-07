<script setup lang="ts">
import type { ActivityItem, ActivityResponse, ActivityStats } from '~/types/activity'

definePageMeta({
  layout: 'default'
})

type Tab = 'all' | 'sessions' | 'events' | 'games'

const toast = useToast()

const stats = ref<ActivityStats | null>(null)
const items = ref<ActivityItem[]>([])
const loading = ref(true)
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

  for (const item of items.value) {
    const t = new Date(item.timestamp).getTime()
    if (t >= startToday) buckets.today!.items.push(item)
    else if (t >= startYesterday) buckets.yesterday!.items.push(item)
    else if (t >= startWeek) buckets.week!.items.push(item)
    else buckets.older!.items.push(item)
  }

  return Object.values(buckets).filter(b => b.items.length > 0)
})

async function load(reset: boolean = true) {
  if (reset) {
    loading.value = true
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
    loading.value = false
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
  // Lightweight refresh that pulls the head of the feed without resetting scroll.
  try {
    const res = await $fetch<ActivityResponse>('/api/activity', {
      query: { type: activeTab.value }
    })
    if (res.stats) stats.value = res.stats
    const seen = new Set(items.value.map(i => i.id))
    const newItems = res.items.filter(i => !seen.has(i.id))
    if (newItems.length > 0) {
      items.value = [...newItems, ...items.value]
    }
  } catch {
    // Silently ignore — the next manual refresh will catch up.
  }
}

watch(activeTab, () => load(true))

function onCompare(payload: { gameId: number, friendId: string }) {
  comparisonGameId.value = payload.gameId
  comparisonFriendId.value = payload.friendId
  comparisonOpen.value = true
}

const ws = useWebSocket()
const cleanups: Array<() => void> = []

onMounted(() => {
  load(true)
  cleanups.push(ws.on('session:update', refreshHead))
  cleanups.push(ws.on('event:update', refreshHead))
  cleanups.push(ws.on('availability:update', refreshHead))
})

onUnmounted(() => {
  for (const cleanup of cleanups) cleanup()
})
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
      <h1 class="text-xl font-bold">
        Activité
      </h1>
      <UButton
        label="Actualiser"
        icon="i-lucide-refresh-cw"
        variant="outline"
        color="neutral"
        size="sm"
        :loading="loading"
        @click="load(true)"
      />
    </div>

    <!-- Stats -->
    <div
      v-if="stats"
      class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
    >
      <div class="rounded-lg border border-default p-4">
        <p class="text-2xl font-bold text-violet-500">
          {{ stats.totalFriends }}
        </p>
        <p class="text-xs text-muted mt-1">
          Amis
        </p>
      </div>
      <div class="rounded-lg border border-default p-4">
        <p class="text-2xl font-bold text-violet-500">
          {{ stats.activeThisWeek }}
        </p>
        <p class="text-xs text-muted mt-1">
          Actifs cette semaine
        </p>
      </div>
      <div class="rounded-lg border border-default p-4">
        <p class="text-2xl font-bold text-violet-500">
          {{ stats.totalGamesInCircle }}
        </p>
        <p class="text-xs text-muted mt-1">
          Jeux dans le cercle
        </p>
      </div>
      <div class="rounded-lg border border-default p-4">
        <p class="text-2xl font-bold text-violet-500">
          {{ stats.commonGames }}
        </p>
        <p class="text-xs text-muted mt-1">
          Jeux en commun
        </p>
      </div>
    </div>

    <UTabs
      v-model="activeTab"
      :items="tabs"
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
      v-else-if="items.length === 0"
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
      <section
        v-for="bucket in groupedItems"
        :key="bucket.key"
      >
        <h2 class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          {{ bucket.label }}
        </h2>
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
      </section>

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

    <GameComparisonModal
      v-model:open="comparisonOpen"
      :game-id="comparisonGameId"
      :friend-id="comparisonFriendId"
    />
  </div>
</template>
