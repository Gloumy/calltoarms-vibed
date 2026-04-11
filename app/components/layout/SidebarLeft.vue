<script setup lang="ts">
const { user, signOut } = useAuth()

const isAdmin = ref(false)

const navigation = [
  { label: 'Accueil', icon: 'i-lucide-home', to: '/' },
  { label: 'Jeux', icon: 'i-lucide-gamepad-2', to: '/games' },
  { label: 'Événements', icon: 'i-lucide-calendar', to: '/events' },
  { label: 'Communautés', icon: 'i-lucide-users', to: '/communities' },
  { label: 'Profil', icon: 'i-lucide-user', to: '/profile' }
]

onMounted(async () => {
  try {
    const me = await $fetch<any>('/api/users/me')
    isAdmin.value = me.isAdmin
  } catch {
    // not admin
  }
})
</script>

<template>
  <aside class="w-[200px] shrink-0 border-r border-default flex flex-col h-screen sticky top-0">
    <!-- Logo -->
    <div class="px-4 py-5">
      <NuxtLink to="/" class="text-lg font-bold text-violet-500">
        Call to Arms
      </NuxtLink>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-2 space-y-1">
      <NuxtLink
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-elevated transition-colors"
        active-class="bg-elevated text-violet-500 font-medium"
      >
        <UIcon :name="item.icon" class="size-4" />
        {{ item.label }}
      </NuxtLink>
      <NuxtLink
        v-if="isAdmin"
        to="/admin"
        class="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-elevated transition-colors"
        active-class="bg-elevated text-violet-500 font-medium"
      >
        <UIcon name="i-lucide-shield" class="size-4" />
        Admin
      </NuxtLink>
    </nav>

    <!-- User info -->
    <div v-if="user" class="p-4 border-t border-default">
      <div class="flex items-center gap-2">
        <UAvatar :src="user.avatarUrl" :alt="user.username" size="sm" />
        <span class="text-sm font-medium truncate">{{ user.username }}</span>
      </div>
      <UButton
        label="Déconnexion"
        icon="i-lucide-log-out"
        variant="ghost"
        color="neutral"
        size="xs"
        class="mt-2 w-full"
        @click="signOut"
      />
    </div>
  </aside>
</template>
