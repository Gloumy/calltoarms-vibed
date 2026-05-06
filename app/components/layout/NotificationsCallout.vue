<script setup lang="ts">
const push = usePushNotifications()
const pwa = usePwaInstall()

const busy = ref(false)
const error = ref('')

// Wait for the SW + permission state to settle before deciding what to show,
// sinon on flashe le callout à chaque navigation.
const ready = computed(() => push.initialized.value)

// Sur iOS Safari, l'API push ne marche que si le PWA est installé sur l'écran
// d'accueil (iOS 16.4+). Tant que ce n'est pas le cas, on guide l'utilisateur
// vers l'install plutôt que la prompt de permission.
const iosNeedsInstall = computed(() => pwa.isIos.value && !pwa.isStandalone.value)

const visible = computed(() => {
  if (!ready.value) return false
  if (push.subscribed.value) return false
  if (push.permission.value === 'unsupported' && !iosNeedsInstall.value) return false
  return true
})

const variant = computed<'install-ios' | 'install-android' | 'denied' | 'default'>(() => {
  if (iosNeedsInstall.value) return 'install-ios'
  if (push.permission.value === 'denied') return 'denied'
  if (pwa.canInstall.value) return 'install-android'
  return 'default'
})

async function enable() {
  busy.value = true
  error.value = ''
  try {
    const ok = await push.subscribe()
    if (!ok && push.permission.value === 'denied') {
      error.value = 'Permission refusée. Active les notifications pour ce site dans les réglages du navigateur.'
    } else if (!ok) {
      error.value = 'Impossible d\'activer les notifications.'
    }
  } finally {
    busy.value = false
  }
}

async function install() {
  busy.value = true
  try {
    await pwa.promptInstall()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div
    v-if="visible"
    class="mb-6 rounded-lg border border-warning/40 bg-warning/10 p-4 flex items-start gap-3"
  >
    <UIcon
      name="i-lucide-bell-off"
      class="size-5 shrink-0 mt-0.5 text-warning"
    />
    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold">
        Notifications désactivées sur cet appareil
      </p>

      <p
        v-if="variant === 'install-ios'"
        class="text-xs text-muted mt-1"
      >
        Sur iPhone, les notifs nécessitent que Call to Arms soit installé sur l'écran d'accueil.
        Touche
        <UIcon
          name="i-lucide-share"
          class="size-3.5 inline align-text-bottom"
        />
        Partager → "Sur l'écran d'accueil", puis ouvre l'app pour activer les notifs.
      </p>
      <p
        v-else-if="variant === 'denied'"
        class="text-xs text-muted mt-1"
      >
        Tu as refusé les notifications. Active-les pour ce site dans les réglages du navigateur,
        sinon tu ne seras pas prévenu quand un ami lance une session.
      </p>
      <p
        v-else-if="variant === 'install-android'"
        class="text-xs text-muted mt-1"
      >
        Sans notifs push, tu ne seras pas prévenu quand un ami lance une session.
        Active-les, et installe l'app pour les recevoir même quand le navigateur est fermé.
      </p>
      <p
        v-else
        class="text-xs text-muted mt-1"
      >
        Sans notifs push, tu ne seras pas prévenu quand un ami lance une session ou t'invite à un événement.
      </p>

      <p
        v-if="error"
        class="text-xs text-warning mt-2"
      >
        {{ error }}
      </p>
    </div>

    <div class="flex flex-col sm:flex-row gap-2 shrink-0">
      <UButton
        v-if="variant === 'install-android' && pwa.canInstall.value"
        label="Installer"
        icon="i-lucide-download"
        variant="outline"
        color="neutral"
        size="sm"
        :loading="busy"
        @click="install"
      />
      <UButton
        v-if="variant !== 'install-ios'"
        label="Activer"
        icon="i-lucide-bell"
        size="sm"
        :loading="busy"
        :disabled="variant === 'denied'"
        @click="enable"
      />
    </div>
  </div>
</template>
