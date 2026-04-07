<script setup lang="ts">
const { user } = useAuth()
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Sidebar gauche -->
    <SidebarLeft />

    <!-- Contenu central -->
    <main class="flex-1 min-w-0 px-6 py-4">
      <slot />
    </main>

    <!-- Sidebar droite -->
    <SidebarRight />
  </div>
</template>
