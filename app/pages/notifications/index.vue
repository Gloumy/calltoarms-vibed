<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

interface NotificationRow {
  id: string
  userId: string
  type: string
  payload: Record<string, unknown> | null
  read: boolean | null
  createdAt: string | null
}

type Tab = 'all' | 'unread'

const toast = useToast()

const items = ref<NotificationRow[]>([])
const loading = ref(true)
const activeTab = ref<Tab>('all')

const unreadCount = computed(() => items.value.filter(n => !n.read).length)

const tabs = computed(() => [
  { value: 'all' as const, label: 'Toutes', icon: 'i-lucide-bell' },
  {
    value: 'unread' as const,
    label: unreadCount.value > 0 ? `Non lues (${unreadCount.value})` : 'Non lues',
    icon: 'i-lucide-mail'
  }
])

const visibleItems = computed(() =>
  activeTab.value === 'unread' ? items.value.filter(n => !n.read) : items.value
)

async function load() {
  loading.value = true
  try {
    items.value = await $fetch<NotificationRow[]>('/api/notifications')
  } catch {
    toast.add({ title: 'Erreur', description: 'Impossible de charger les notifications', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function markAsRead(notification: NotificationRow) {
  if (notification.read) return
  notification.read = true
  try {
    await $fetch('/api/notifications/read', {
      method: 'POST',
      body: { id: notification.id }
    })
  } catch {
    notification.read = false
    toast.add({ title: 'Erreur', description: 'Impossible de marquer comme lue', color: 'error' })
  }
}

async function markAllAsRead() {
  if (unreadCount.value === 0) return
  const previous = items.value.map(n => n.read)
  items.value.forEach((n) => { n.read = true })
  try {
    await $fetch('/api/notifications/read', { method: 'POST', body: {} })
    toast.add({ title: 'Toutes marquées comme lues', color: 'success' })
  } catch {
    items.value.forEach((n, i) => { n.read = previous[i] ?? false })
    toast.add({ title: 'Erreur', description: 'Impossible de marquer comme lues', color: 'error' })
  }
}

interface Descriptor {
  icon: string
  color: string
  title: string
  body: string
  to: string | null
}

function str(payload: Record<string, unknown> | null, key: string): string {
  const v = payload?.[key]
  return typeof v === 'string' ? v : ''
}

function describe(n: NotificationRow): Descriptor {
  const p = n.payload
  switch (n.type) {
    case 'friend_request':
      return {
        icon: 'i-lucide-user-plus',
        color: 'text-violet-500',
        title: 'Demande d\'ami',
        body: str(p, 'senderUsername')
          ? `${str(p, 'senderUsername')} veut t'ajouter en ami`
          : 'Quelqu\'un veut t\'ajouter en ami',
        to: '/friends'
      }
    case 'friend_accepted':
      return {
        icon: 'i-lucide-user-check',
        color: 'text-emerald-500',
        title: 'Demande acceptée',
        body: str(p, 'acceptedByUsername')
          ? `${str(p, 'acceptedByUsername')} a accepté ta demande d'ami`
          : 'Ta demande d\'ami a été acceptée',
        to: str(p, 'acceptedBy') ? `/users/${str(p, 'acceptedBy')}` : '/friends'
      }
    case 'session_started':
      return {
        icon: 'i-lucide-gamepad-2',
        color: 'text-violet-500',
        title: 'Nouvelle session',
        body: str(p, 'creatorName')
          ? `${str(p, 'creatorName')} lance une session`
          : 'Un ami lance une session',
        to: str(p, 'sessionId') ? `/sessions/${str(p, 'sessionId')}` : null
      }
    case 'event_invited':
      return {
        icon: 'i-lucide-calendar-plus',
        color: 'text-blue-500',
        title: 'Invitation à un événement',
        body: str(p, 'creatorName')
          ? `${str(p, 'creatorName')} t'a invité à un événement`
          : 'Tu es invité à un événement',
        to: str(p, 'eventId') ? `/events/${str(p, 'eventId')}` : '/events'
      }
    case 'event_created':
      return {
        icon: 'i-lucide-calendar',
        color: 'text-blue-500',
        title: 'Nouvel événement',
        body: str(p, 'creatorName')
          ? `${str(p, 'creatorName')} a créé un événement`
          : 'Un ami a créé un événement',
        to: str(p, 'eventId') ? `/events/${str(p, 'eventId')}` : '/events'
      }
    case 'community_invited':
      return {
        icon: 'i-lucide-users',
        color: 'text-amber-500',
        title: 'Invitation à une communauté',
        body: str(p, 'inviterName')
          ? `${str(p, 'inviterName')} t'a invité à une communauté`
          : 'Tu es invité à une communauté',
        to: str(p, 'communityId') ? `/communities/${str(p, 'communityId')}` : '/communities'
      }
    case 'availability':
      return {
        icon: 'i-lucide-zap',
        color: 'text-emerald-500',
        title: 'Ami disponible',
        body: str(p, 'username')
          ? str(p, 'gameName')
            ? `${str(p, 'username')} cherche des joueurs sur ${str(p, 'gameName')}`
            : `${str(p, 'username')} est disponible pour jouer`
          : 'Un ami est disponible',
        to: str(p, 'userId') ? `/users/${str(p, 'userId')}` : null
      }
    default:
      return {
        icon: 'i-lucide-bell',
        color: 'text-muted',
        title: str(p, 'title') || 'Notification',
        body: str(p, 'body') || '',
        to: str(p, 'url') || null
      }
  }
}

function formatRelative(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'à l\'instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days} j`
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`
  return `il y a ${Math.floor(days / 365)} an${days >= 730 ? 's' : ''}`
}

async function handleClick(n: NotificationRow) {
  await markAsRead(n)
  const d = describe(n)
  if (d.to) await navigateTo(d.to)
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
      <h1 class="text-xl font-bold">
        Notifications
      </h1>
      <UButton
        v-if="unreadCount > 0"
        label="Tout marquer comme lu"
        icon="i-lucide-check-check"
        size="sm"
        variant="outline"
        color="neutral"
        @click="markAllAsRead"
      />
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
      v-else-if="visibleItems.length === 0"
      class="text-center py-12"
    >
      <UIcon
        name="i-lucide-bell-off"
        class="size-10 text-muted mx-auto mb-3"
      />
      <p class="text-sm text-muted">
        {{ activeTab === 'unread' ? 'Aucune notification non lue.' : 'Aucune notification pour le moment.' }}
      </p>
    </div>

    <ul
      v-else
      class="space-y-2"
    >
      <li
        v-for="n in visibleItems"
        :key="n.id"
        class="rounded-lg border border-default p-3 sm:p-4 flex items-start gap-3 cursor-pointer hover:bg-elevated transition-colors"
        :class="{ 'bg-elevated/50': !n.read }"
        @click="handleClick(n)"
      >
        <div class="relative shrink-0 mt-0.5">
          <UIcon
            :name="describe(n).icon"
            :class="['size-5', describe(n).color]"
          />
          <span
            v-if="!n.read"
            class="absolute -top-1 -right-1 size-2 rounded-full bg-violet-500"
          />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-baseline justify-between gap-2 flex-wrap">
            <p
              class="text-sm font-medium truncate"
              :class="{ 'text-muted': n.read }"
            >
              {{ describe(n).title }}
            </p>
            <span class="text-xs text-muted shrink-0">
              {{ formatRelative(n.createdAt) }}
            </span>
          </div>
          <p
            v-if="describe(n).body"
            class="text-sm text-muted mt-0.5"
          >
            {{ describe(n).body }}
          </p>
        </div>

        <UIcon
          v-if="describe(n).to"
          name="i-lucide-chevron-right"
          class="size-4 text-muted shrink-0 self-center"
        />
      </li>
    </ul>
  </div>
</template>
