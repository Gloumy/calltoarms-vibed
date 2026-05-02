<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

type PlatformTab = 'steam' | 'playstation' | 'xbox'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const tabs = [
  { value: 'steam', label: 'Steam', icon: 'i-simple-icons-steam' },
  { value: 'playstation', label: 'PlayStation', icon: 'i-simple-icons-playstation' },
  { value: 'xbox', label: 'Xbox', icon: 'i-simple-icons-xbox' }
]

const VALID_TABS: PlatformTab[] = ['steam', 'playstation', 'xbox']
const queryPlatform = String(route.query.platform ?? '')
const activeTab = ref<PlatformTab>(
  (VALID_TABS as string[]).includes(queryPlatform) ? queryPlatform as PlatformTab : 'steam'
)

const psRef = ref<{ load: () => Promise<void> } | null>(null)

onMounted(() => {
  if (route.query.steam_connected) {
    toast.add({ title: 'Steam connecté', description: 'Lance une synchronisation pour récupérer ta bibliothèque.', color: 'success' })
    router.replace({ query: {} })
  } else if (route.query.steam_error) {
    toast.add({ title: 'Erreur Steam', description: String(route.query.steam_error), color: 'error' })
    router.replace({ query: {} })
  } else if (route.query.xbox_connected) {
    toast.add({ title: 'Xbox connecté', description: 'Lance une synchronisation pour récupérer ta bibliothèque.', color: 'success' })
    router.replace({ query: {} })
  } else if (route.query.xbox_error) {
    toast.add({ title: 'Erreur Xbox', description: String(route.query.xbox_error), color: 'error' })
    router.replace({ query: {} })
  }
})

function onPlayStationConnected() {
  psRef.value?.load()
}
</script>

<template>
  <div class="lg:h-[calc(100vh-2rem)] lg:flex lg:flex-col">
    <div class="flex items-center justify-between mb-6 shrink-0">
      <h1 class="text-2xl font-bold">
        Ma bibliothèque
      </h1>
    </div>

    <UTabs
      v-model="activeTab"
      :items="tabs"
      class="lg:flex-1 lg:flex lg:flex-col lg:min-h-0"
      :ui="{ content: 'lg:flex-1 lg:flex lg:flex-col lg:min-h-0' }"
    >
      <template #content="{ item }">
        <PlatformLibrary
          v-if="item.value === 'steam'"
          platform="steam"
          label="Steam"
          icon="i-simple-icons-steam"
          cover-aspect="460/215"
        >
          <template #connect>
            <div class="rounded-lg border border-default bg-default p-8 text-center max-w-xl mx-auto">
              <UIcon
                name="i-simple-icons-steam"
                class="size-12 text-muted mx-auto mb-3"
              />
              <h2 class="text-lg font-semibold mb-2">
                Connecte ton compte Steam
              </h2>
              <p class="text-sm text-muted mb-6">
                Lie ton compte Steam pour synchroniser tes jeux, ton temps de jeu et tes succès.
              </p>
              <UButton
                label="Connecter Steam"
                icon="i-simple-icons-steam"
                size="lg"
                to="/api/platforms/steam/auth"
                external
              />
            </div>
          </template>
        </PlatformLibrary>

        <PlatformLibrary
          v-else-if="item.value === 'playstation'"
          ref="psRef"
          platform="playstation"
          label="PlayStation"
          icon="i-simple-icons-playstation"
          cover-aspect="1/1"
        >
          <template #connect>
            <PlayStationConnector @connected="onPlayStationConnected" />
          </template>
        </PlatformLibrary>

        <PlatformLibrary
          v-else-if="item.value === 'xbox'"
          platform="xbox"
          label="Xbox"
          icon="i-simple-icons-xbox"
          cover-aspect="16/9"
        >
          <template #connect>
            <div class="rounded-lg border border-default bg-default p-8 text-center max-w-xl mx-auto">
              <UIcon
                name="i-simple-icons-xbox"
                class="size-12 text-muted mx-auto mb-3"
              />
              <h2 class="text-lg font-semibold mb-2">
                Connecte ton compte Xbox
              </h2>
              <p class="text-sm text-muted mb-6">
                Lie ton compte Microsoft pour synchroniser tes jeux Xbox, ton temps de jeu et tes succès.
              </p>
              <UButton
                label="Connecter Xbox"
                icon="i-simple-icons-xbox"
                size="lg"
                to="/api/platforms/xbox/auth"
                external
              />
            </div>
          </template>
        </PlatformLibrary>
      </template>
    </UTabs>
  </div>
</template>
