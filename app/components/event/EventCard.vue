<script setup lang="ts">
const props = defineProps<{
  event: {
    id: string
    created_by: string
    title: string
    description: string | null
    visibility: string
    scheduled_at: string
    game_name: string | null
    game_cover_url: string | null
    creator_name: string
    creator_avatar: string | null
    community_name: string | null
    accepted_count: number
    maybe_count: number
    my_status: string | null
  }
}>()

const { user } = useAuth()

const isOwner = computed(() => user.value?.id === props.event.created_by)

const scheduledDate = computed(() => {
  const d = new Date(props.event.scheduled_at)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  if (diffDays === 0) return `Aujourd'hui a ${time}`
  if (diffDays === 1) return `Demain a ${time}`
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} a ${time}`
})

const statusBadge = computed(() => {
  switch (props.event.my_status) {
    case 'accepted': return { label: 'Participe', color: 'success' as const }
    case 'maybe': return { label: 'Peut-etre', color: 'warning' as const }
    case 'declined': return { label: 'Decline', color: 'neutral' as const }
    case 'invited': return { label: 'Invite', color: 'info' as const }
    default: return null
  }
})
</script>

<template>
  <NuxtLink
    :to="`/events/${event.id}`"
    class="block h-full rounded-lg border border-default bg-default overflow-hidden hover:border-violet-500/50 transition-colors"
  >
    <div class="flex h-full">
      <!-- Game thumbnail — full bleed -->
      <img
        v-if="event.game_cover_url"
        :src="event.game_cover_url"
        :alt="event.game_name ?? ''"
        class="w-16 object-cover shrink-0"
      >
      <div
        v-else
        class="w-16 bg-violet-500/20 text-violet-500 flex items-center justify-center shrink-0"
      >
        <UIcon name="i-lucide-calendar" class="size-5" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0 p-4">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="text-base font-semibold truncate">
            {{ event.title }}
          </h3>
          <UBadge v-if="statusBadge" :color="statusBadge.color" variant="subtle" size="sm">
            {{ statusBadge.label }}
          </UBadge>
        </div>

        <p class="text-sm text-muted mb-1">
          <UIcon name="i-lucide-clock" class="size-3.5 inline-block mr-0.5" />
          {{ scheduledDate }}
          <span v-if="event.game_name" class="mx-1">&middot;</span>
          <span v-if="event.game_name">{{ event.game_name }}</span>
        </p>

        <p class="text-sm text-muted">
          <span class="inline-flex items-center gap-1">
            <UAvatar :src="event.creator_avatar ?? undefined" :alt="event.creator_name" size="3xs" />
            {{ event.creator_name }}
          </span>
          <span class="mx-1">&middot;</span>
          <UIcon name="i-lucide-users" class="size-3.5 inline-block mr-0.5" />
          {{ event.accepted_count }} participant{{ event.accepted_count > 1 ? 's' : '' }}
          <template v-if="event.maybe_count > 0">
            + {{ event.maybe_count }} peut-etre
          </template>
          <span v-if="event.community_name" class="mx-1">&middot;</span>
          <span v-if="event.community_name" class="text-violet-500">{{ event.community_name }}</span>
        </p>
      </div>
    </div>
  </NuxtLink>
</template>
