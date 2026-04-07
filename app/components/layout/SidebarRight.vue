<script setup lang="ts">
// TODO Phase 4: WebSocket realtime friends list
const friends = ref<any[]>([])
</script>

<template>
  <aside class="w-[210px] shrink-0 border-l border-default h-screen sticky top-0 overflow-y-auto">
    <div class="px-4 py-5">
      <h3 class="text-xs font-semibold uppercase text-muted tracking-wider">
        Amis
      </h3>
    </div>

    <!-- Placeholder: sera rempli en Phase 4 -->
    <div class="px-4 text-sm text-muted">
      <p>Connecte-toi pour voir tes amis en ligne.</p>
    </div>
  </aside>
</template>
