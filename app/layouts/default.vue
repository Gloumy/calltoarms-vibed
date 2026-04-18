<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'

const isDesktop = useMediaQuery('(min-width: 1024px)')
const openLeft = ref(false)
const openRight = ref(false)
</script>

<template>
  <div class="min-h-screen flex flex-col lg:flex-row">
    <!-- Mobile top bar -->
    <header class="lg:hidden sticky top-0 z-30 bg-default border-b border-default flex items-center justify-between px-2 h-14 shrink-0">
      <UButton
        icon="i-lucide-menu"
        variant="ghost"
        color="neutral"
        aria-label="Ouvrir le menu"
        @click="openLeft = true"
      />
      <NuxtLink to="/" class="flex items-center gap-2 text-base font-bold text-violet-500">
        <img src="/logo.png" alt="" class="size-9 object-contain">
        Call to Arms
      </NuxtLink>
      <UButton
        icon="i-lucide-users"
        variant="ghost"
        color="neutral"
        aria-label="Afficher les amis"
        @click="openRight = true"
      />
    </header>

    <!-- Desktop left sidebar (single-mount) -->
    <SidebarLeft v-if="isDesktop" />

    <!-- Main content -->
    <main class="flex-1 min-w-0 px-3 sm:px-6 py-4">
      <slot />
    </main>

    <!-- Desktop right sidebar (single-mount) -->
    <SidebarRight v-if="isDesktop" />

    <!-- Mobile drawers -->
    <USlideover
      v-if="!isDesktop"
      v-model:open="openLeft"
      side="left"
      :ui="{ content: 'w-[260px] max-w-[85vw]', body: 'p-0 sm:p-0' }"
    >
      <template #body>
        <SidebarLeft variant="drawer" @navigate="openLeft = false" />
      </template>
    </USlideover>

    <USlideover
      v-if="!isDesktop"
      v-model:open="openRight"
      side="right"
      :ui="{ content: 'w-[280px] max-w-[85vw]', body: 'p-0 sm:p-0' }"
    >
      <template #body>
        <SidebarRight variant="drawer" />
      </template>
    </USlideover>
  </div>
</template>
