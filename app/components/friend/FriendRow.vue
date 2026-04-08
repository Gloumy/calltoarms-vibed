<script setup lang="ts">
const props = defineProps<{
  friend: {
    id: string
    username: string
    name: string
    image: string | null
    isAvailable: boolean
    availableGameId: number | null
    inSession: boolean
    sessionGameName: string | null
    notifDisabled: boolean
  }
  status: 'in_session' | 'playing' | 'available' | 'online' | 'offline'
}>()

const emit = defineEmits<{
  toggleNotif: [friendId: string, disabled: boolean]
}>()

const statusDot = computed(() => {
  switch (props.status) {
    case 'in_session': return 'bg-violet-500'
    case 'playing': return 'bg-violet-500'
    case 'available': return 'bg-teal-500'
    case 'online': return 'bg-green-500'
    default: return 'bg-gray-400'
  }
})

const statusLabel = computed(() => {
  switch (props.status) {
    case 'in_session': return props.friend.sessionGameName ? `En session — ${props.friend.sessionGameName}` : 'En session'
    case 'playing': return 'En jeu'
    case 'available': return 'Disponible'
    case 'online': return 'En ligne'
    default: return 'Hors ligne'
  }
})
</script>

<template>
  <div
    class="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-elevated transition-colors"
    :class="{ 'opacity-45': status === 'offline' }"
  >
    <div class="relative">
      <UAvatar :src="friend.image ?? undefined" :alt="friend.username" size="xs" />
      <span
        class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-default"
        :class="statusDot"
      />
    </div>

    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium truncate">
        {{ friend.username }}
      </p>
      <p class="text-xs truncate" :class="status === 'playing' ? 'text-violet-500' : 'text-muted'">
        {{ statusLabel }}
      </p>
    </div>

    <UButton
      :icon="friend.notifDisabled ? 'i-lucide-bell-off' : 'i-lucide-bell'"
      variant="ghost"
      color="neutral"
      size="xs"
      :title="friend.notifDisabled ? 'Activer les notifications' : 'Désactiver les notifications'"
      @click.stop="emit('toggleNotif', friend.id, !friend.notifDisabled)"
    />
  </div>
</template>
