<script setup lang="ts">
const { $pwa } = useNuxtApp()

const visible = computed(() => !!$pwa?.needRefresh)
const busy = ref(false)

async function reload() {
  if (!$pwa) return
  busy.value = true
  // updateServiceWorker(true) envoie SKIP_WAITING au SW en attente puis
  // recharge la page une fois le nouveau SW activé.
  await $pwa.updateServiceWorker(true)
}

function dismiss() {
  $pwa?.cancelPrompt()
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-4 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-4 opacity-0"
  >
    <div
      v-if="visible"
      class="fixed z-50 bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:max-w-sm rounded-lg border border-primary/40 bg-elevated/95 backdrop-blur shadow-lg p-4 flex items-start gap-3"
    >
      <UIcon
        name="i-lucide-download-cloud"
        class="size-5 shrink-0 mt-0.5 text-primary"
      />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold">
          Nouvelle version disponible
        </p>
        <p class="text-xs text-muted mt-1">
          Recharge pour profiter des dernières améliorations.
        </p>
      </div>
      <div class="flex flex-col gap-2 shrink-0">
        <UButton
          label="Recharger"
          icon="i-lucide-rotate-cw"
          size="sm"
          :loading="busy"
          @click="reload"
        />
        <UButton
          label="Plus tard"
          variant="ghost"
          color="neutral"
          size="sm"
          :disabled="busy"
          @click="dismiss"
        />
      </div>
    </div>
  </Transition>
</template>
