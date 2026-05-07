<script setup lang="ts">
import type { ActivityItem } from '~/types/activity'

const props = defineProps<{
  item: ActivityItem
}>()

const emit = defineEmits<{
  compare: [{ gameId: number, friendId: string }]
}>()

interface Descriptor {
  icon: string
  color: string
  body: string
  to: string | null
  action: { label: string, icon: string, kind: 'link' | 'compare', disabled?: boolean } | null
  badge: { label: string, icon: string, color: 'neutral' | 'warning' | 'error' | 'info' } | null
}

const descriptor = computed<Descriptor>(() => {
  const i = props.item
  switch (i.type) {
    case 'session_started': {
      const gameName = i.game?.name?.trim()
      const closed = i.sessionStatus === 'closed'
      return {
        icon: 'i-lucide-gamepad-2',
        color: 'text-violet-500',
        body: gameName
          ? `${i.actor.username} a lancé une session sur ${gameName}`
          : `${i.actor.username} a lancé une session`,
        to: i.sessionId ? `/sessions/${i.sessionId}` : null,
        action: i.sessionId
          ? { label: 'Rejoindre', icon: 'i-lucide-arrow-right', kind: 'link', disabled: closed }
          : null,
        badge: closed
          ? { label: 'Terminée', icon: 'i-lucide-circle-x', color: 'error' }
          : { label: 'En cours', icon: 'i-lucide-circle-dot', color: 'info' }
      }
    }
    case 'event_created': {
      const past = i.eventStatus === 'past'
      return {
        icon: 'i-lucide-calendar',
        color: 'text-blue-500',
        body: i.eventTitle
          ? `${i.actor.username} a créé l'événement « ${i.eventTitle} »`
          : `${i.actor.username} a créé un événement`,
        to: i.eventId ? `/events/${i.eventId}` : null,
        action: i.eventId ? { label: 'Voir', icon: 'i-lucide-arrow-right', kind: 'link' } : null,
        badge: past
          ? { label: 'Passé', icon: 'i-lucide-history', color: 'warning' }
          : { label: 'À venir', icon: 'i-lucide-clock', color: 'info' }
      }
    }
    case 'event_invited': {
      const past = i.eventStatus === 'past'
      return {
        icon: 'i-lucide-calendar-plus',
        color: 'text-blue-500',
        body: i.eventTitle
          ? `${i.actor.username} t'a invité à « ${i.eventTitle} »`
          : `${i.actor.username} t'a invité à un événement`,
        to: i.eventId ? `/events/${i.eventId}` : null,
        action: i.eventId ? { label: 'Voir', icon: 'i-lucide-arrow-right', kind: 'link' } : null,
        badge: past
          ? { label: 'Passé', icon: 'i-lucide-history', color: 'warning' }
          : { label: 'À venir', icon: 'i-lucide-clock', color: 'info' }
      }
    }
    case 'community_invited':
      return {
        icon: 'i-lucide-users',
        color: 'text-amber-500',
        body: i.communityName
          ? `${i.actor.username} t'a invité à « ${i.communityName} »`
          : `${i.actor.username} t'a invité à une communauté`,
        to: i.communityId ? `/communities/${i.communityId}` : null,
        action: i.communityId ? { label: 'Voir', icon: 'i-lucide-arrow-right', kind: 'link' } : null,
        badge: null
      }
    case 'friend_accepted':
      return {
        icon: 'i-lucide-user-check',
        color: 'text-emerald-500',
        body: `Vous êtes amis avec ${i.actor.username}`,
        to: `/users/${i.actor.id}`,
        action: { label: 'Voir profil', icon: 'i-lucide-arrow-right', kind: 'link' },
        badge: null
      }
    case 'game_completed':
      return {
        icon: 'i-lucide-trophy',
        color: 'text-emerald-500',
        body: i.game?.name
          ? `${i.actor.username} a terminé ${i.game.name}`
          : `${i.actor.username} a terminé un jeu`,
        to: null,
        action: i.game?.id ? { label: 'Comparer', icon: 'i-lucide-bar-chart-3', kind: 'compare' } : null,
        badge: null
      }
    case 'achievements_unlocked': {
      const n = i.count ?? 0
      const gameName = i.game?.name ?? 'un jeu'
      return {
        icon: 'i-lucide-award',
        color: 'text-amber-500',
        body: n > 1
          ? `${i.actor.username} a débloqué ${n} succès sur ${gameName}`
          : `${i.actor.username} a débloqué un succès sur ${gameName}`,
        to: null,
        action: i.game?.id ? { label: 'Comparer', icon: 'i-lucide-bar-chart-3', kind: 'compare' } : null,
        badge: null
      }
    }
    default:
      return { icon: 'i-lucide-circle', color: 'text-muted', body: '', to: null, action: null, badge: null }
  }
})

function formatRelative(iso: string): string {
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

function onActionClick() {
  const d = descriptor.value
  if (!d.action) return
  if (d.action.kind === 'compare' && props.item.game?.id) {
    emit('compare', { gameId: props.item.game.id, friendId: props.item.actor.id })
  } else if (d.action.kind === 'link' && d.to) {
    navigateTo(d.to)
  }
}
</script>

<template>
  <div class="rounded-lg border border-default overflow-hidden flex items-stretch hover:bg-elevated/50 transition-colors">
    <!-- Game cover: flush-left, full card height (matches SessionCard pattern) -->
    <div
      v-if="item.game?.coverUrl"
      class="relative shrink-0 w-20 bg-elevated"
    >
      <img
        :src="item.game.coverUrl"
        :alt="item.game.name"
        class="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      >
      <UAvatar
        :src="item.actor.image ?? undefined"
        :alt="item.actor.username"
        size="2xs"
        class="absolute bottom-1 right-1 ring-2 ring-default"
      />
    </div>

    <div class="flex-1 min-w-0 flex items-start gap-3 p-3 sm:p-4">
      <UAvatar
        v-if="!item.game?.coverUrl"
        :src="item.actor.image ?? undefined"
        :alt="item.actor.username"
        size="md"
        class="shrink-0"
      />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <UIcon
            :name="descriptor.icon"
            :class="['size-4 shrink-0', descriptor.color]"
          />
          <p class="text-sm">
            {{ descriptor.body }}
          </p>
        </div>
        <div class="flex items-center gap-2 mt-1 flex-wrap">
          <p class="text-xs text-muted">
            {{ formatRelative(item.timestamp) }}
          </p>
          <UBadge
            v-if="descriptor.badge"
            :color="descriptor.badge.color"
            variant="subtle"
            size="xs"
          >
            <UIcon
              :name="descriptor.badge.icon"
              class="size-3 mr-1"
            />
            {{ descriptor.badge.label }}
          </UBadge>
        </div>
      </div>

      <UButton
        v-if="descriptor.action"
        :label="descriptor.action.label"
        :icon="descriptor.action.icon"
        :variant="descriptor.action.disabled ? 'ghost' : (descriptor.action.kind === 'compare' ? 'soft' : 'outline')"
        :color="descriptor.action.kind === 'compare' ? 'primary' : 'neutral'"
        :disabled="descriptor.action.disabled"
        size="xs"
        class="shrink-0 self-center"
        :class="{ 'opacity-40': descriptor.action.disabled }"
        @click="onActionClick"
      />
    </div>
  </div>
</template>
