<script setup lang="ts">
withDefaults(defineProps<{
  showHeader?: boolean
}>(), {
  showHeader: true
})

interface FriendRow {
  id: string
  username: string
  name: string
  image: string | null
  isOnline: boolean
  isAvailable: boolean
  inSession: boolean
  sessionId: string | null
  sessionGameName: string | null
  notifDisabled: boolean
}

interface PendingReceivedRow {
  senderId: string
  createdAt: string | null
  senderUsername: string
  senderName: string
  senderImage: string | null
}

interface PendingSentRow {
  receiverId: string
  createdAt: string | null
  receiverUsername: string
  receiverName: string
  receiverImage: string | null
}

type FriendsTab = 'all' | 'received' | 'sent'

const toast = useToast()

const friends = ref<FriendRow[]>([])
const received = ref<PendingReceivedRow[]>([])
const sent = ref<PendingSentRow[]>([])
const loading = ref(true)
const activeTab = ref<FriendsTab>('all')
const showAddModal = ref(false)

const tabs = computed(() => [
  { value: 'all' as const, label: 'Mes amis', icon: 'i-lucide-users' },
  {
    value: 'received' as const,
    label: received.value.length > 0 ? `Reçues (${received.value.length})` : 'Reçues',
    icon: 'i-lucide-mail-open'
  },
  { value: 'sent' as const, label: 'Envoyées', icon: 'i-lucide-send' }
])

async function load() {
  loading.value = true
  try {
    const [f, r, s] = await Promise.all([
      $fetch<{ friends: FriendRow[] }>('/api/friends'),
      $fetch<PendingReceivedRow[]>('/api/friends/pending'),
      $fetch<PendingSentRow[]>('/api/friends/sent')
    ])
    friends.value = f.friends
    received.value = r
    sent.value = s
  } catch {
    toast.add({ title: 'Erreur', description: 'Impossible de charger la liste d\'amis', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function respond(senderId: string, action: 'accept' | 'reject') {
  try {
    await $fetch(`/api/friends/${senderId}/respond`, {
      method: 'POST',
      body: { action }
    })
    toast.add({
      title: action === 'accept' ? 'Demande acceptée' : 'Demande refusée',
      color: 'success'
    })
    await load()
    if (action === 'accept') activeTab.value = 'all'
  } catch (e: unknown) {
    const message = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Erreur'
    toast.add({ title: 'Erreur', description: message, color: 'error' })
  }
}

async function removeFriendship(otherId: string, label: string) {
  if (!confirm(`${label} ?`)) return
  try {
    await $fetch(`/api/friends/${otherId}`, { method: 'DELETE' })
    toast.add({ title: 'Fait', color: 'success' })
    await load()
  } catch (e: unknown) {
    const message = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Erreur'
    toast.add({ title: 'Erreur', description: message, color: 'error' })
  }
}

async function toggleNotif(friendId: string, disabled: boolean) {
  try {
    await $fetch(`/api/friends/${friendId}/notif`, {
      method: 'PATCH',
      body: { disabled }
    })
    const target = friends.value.find(f => f.id === friendId)
    if (target) target.notifDisabled = disabled
  } catch {
    toast.add({ title: 'Erreur', description: 'Modification impossible', color: 'error' })
  }
}

function statusLabel(f: FriendRow): { label: string, dot: string } {
  if (f.inSession) return { label: f.sessionGameName ? `En session — ${f.sessionGameName}` : 'En session', dot: 'bg-violet-500' }
  if (f.isAvailable) return { label: 'Disponible', dot: 'bg-teal-500' }
  if (f.isOnline) return { label: 'En ligne', dot: 'bg-green-500' }
  return { label: 'Hors ligne', dot: 'bg-gray-400' }
}

function friendMenuItems(f: FriendRow) {
  return [[
    {
      label: 'Voir le profil',
      icon: 'i-lucide-user',
      to: `/users/${f.id}`
    },
    {
      label: 'Voir la bibliothèque',
      icon: 'i-lucide-library',
      to: `/library/friend/${f.id}`
    },
    {
      label: f.notifDisabled ? 'Activer les notifications' : 'Désactiver les notifications',
      icon: f.notifDisabled ? 'i-lucide-bell' : 'i-lucide-bell-off',
      onSelect: () => toggleNotif(f.id, !f.notifDisabled)
    }
  ], [
    {
      label: 'Retirer de mes amis',
      icon: 'i-lucide-user-x',
      color: 'error' as const,
      onSelect: () => removeFriendship(f.id, `Retirer ${f.username} de tes amis`)
    }
  ]]
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(load)
</script>

<template>
  <div>
    <div
      v-if="showHeader"
      class="flex items-center justify-between mb-6"
    >
      <h1 class="text-2xl font-bold">
        Amis
      </h1>
      <UButton
        label="Ajouter un ami"
        icon="i-lucide-user-plus"
        size="sm"
        @click="showAddModal = true"
      />
    </div>
    <div
      v-else
      class="flex justify-end mb-4"
    >
      <UButton
        label="Ajouter un ami"
        icon="i-lucide-user-plus"
        size="sm"
        @click="showAddModal = true"
      />
    </div>

    <UTabs
      v-model="activeTab"
      :items="tabs"
    >
      <template #content="{ item }">
        <div
          v-if="loading"
          class="flex items-center justify-center py-12"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="size-6 animate-spin text-muted"
          />
        </div>

        <!-- Mes amis -->
        <div v-else-if="item.value === 'all'">
          <div
            v-if="friends.length === 0"
            class="text-center py-12 text-muted"
          >
            <UIcon
              name="i-lucide-users"
              class="size-12 mx-auto mb-3"
            />
            <p>Aucun ami pour l'instant.</p>
            <p class="text-xs mt-1">
              Clique sur « Ajouter un ami » pour envoyer une demande.
            </p>
          </div>
          <div
            v-else
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3"
          >
            <div
              v-for="f in friends"
              :key="f.id"
              class="relative group"
            >
              <NuxtLink
                :to="`/users/${f.id}`"
                class="block rounded-lg border border-default bg-default overflow-hidden transition-colors hover:border-violet-500/50"
              >
                <div class="relative aspect-square bg-elevated">
                  <img
                    v-if="f.image"
                    :src="f.image"
                    :alt="f.username"
                    class="w-full h-full object-cover"
                    loading="lazy"
                  >
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-3xl font-bold text-violet-500/40"
                  >
                    {{ f.username.charAt(0).toUpperCase() }}
                  </div>
                  <span
                    class="absolute bottom-1.5 right-1.5 size-3.5 rounded-full border-2 border-default"
                    :class="statusLabel(f).dot"
                    :title="statusLabel(f).label"
                  />
                  <UIcon
                    v-if="f.notifDisabled"
                    name="i-lucide-bell-off"
                    class="absolute top-1.5 left-1.5 size-4 text-white drop-shadow"
                    title="Notifications désactivées"
                  />
                </div>
                <div class="p-2">
                  <h3
                    class="text-xs font-semibold truncate"
                    :title="f.username"
                  >
                    {{ f.username }}
                  </h3>
                  <p class="text-[11px] text-muted truncate">
                    {{ statusLabel(f).label }}
                  </p>
                </div>
              </NuxtLink>

              <UDropdownMenu
                :items="friendMenuItems(f)"
                :content="{ align: 'end' }"
              >
                <UButton
                  icon="i-lucide-more-vertical"
                  variant="solid"
                  color="neutral"
                  size="xs"
                  class="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity bg-black/60 backdrop-blur"
                  @click.stop.prevent
                />
              </UDropdownMenu>
            </div>
          </div>
        </div>

        <!-- Demandes reçues -->
        <div v-else-if="item.value === 'received'">
          <div
            v-if="received.length === 0"
            class="text-center py-12 text-muted"
          >
            <UIcon
              name="i-lucide-mail-open"
              class="size-12 mx-auto mb-3"
            />
            <p>Aucune demande reçue.</p>
          </div>
          <div
            v-else
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3"
          >
            <div
              v-for="r in received"
              :key="r.senderId"
              class="rounded-lg border border-default bg-default overflow-hidden"
            >
              <NuxtLink
                :to="`/users/${r.senderId}`"
                class="block"
              >
                <div class="aspect-square bg-elevated">
                  <img
                    v-if="r.senderImage"
                    :src="r.senderImage"
                    :alt="r.senderUsername"
                    class="w-full h-full object-cover"
                    loading="lazy"
                  >
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-3xl font-bold text-violet-500/40"
                  >
                    {{ r.senderUsername.charAt(0).toUpperCase() }}
                  </div>
                </div>
                <div class="p-2">
                  <h3
                    class="text-xs font-semibold truncate"
                    :title="r.senderUsername"
                  >
                    {{ r.senderUsername }}
                  </h3>
                  <p class="text-[11px] text-muted truncate">
                    Reçue le {{ formatDate(r.createdAt) }}
                  </p>
                </div>
              </NuxtLink>
              <div class="flex border-t border-default">
                <button
                  class="flex-1 py-2 text-xs font-medium text-success hover:bg-success-50/40 dark:hover:bg-success-950/40 transition-colors flex items-center justify-center gap-1"
                  @click="respond(r.senderId, 'accept')"
                >
                  <UIcon
                    name="i-lucide-check"
                    class="size-3.5"
                  />
                  Accepter
                </button>
                <button
                  class="flex-1 py-2 text-xs font-medium text-error hover:bg-error-50/40 dark:hover:bg-error-950/40 transition-colors flex items-center justify-center gap-1 border-l border-default"
                  @click="respond(r.senderId, 'reject')"
                >
                  <UIcon
                    name="i-lucide-x"
                    class="size-3.5"
                  />
                  Refuser
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Demandes envoyées -->
        <div v-else-if="item.value === 'sent'">
          <div
            v-if="sent.length === 0"
            class="text-center py-12 text-muted"
          >
            <UIcon
              name="i-lucide-send"
              class="size-12 mx-auto mb-3"
            />
            <p>Aucune demande en attente.</p>
          </div>
          <div
            v-else
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3"
          >
            <div
              v-for="s in sent"
              :key="s.receiverId"
              class="rounded-lg border border-default bg-default overflow-hidden"
            >
              <NuxtLink
                :to="`/users/${s.receiverId}`"
                class="block"
              >
                <div class="aspect-square bg-elevated">
                  <img
                    v-if="s.receiverImage"
                    :src="s.receiverImage"
                    :alt="s.receiverUsername"
                    class="w-full h-full object-cover"
                    loading="lazy"
                  >
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-3xl font-bold text-violet-500/40"
                  >
                    {{ s.receiverUsername.charAt(0).toUpperCase() }}
                  </div>
                </div>
                <div class="p-2">
                  <h3
                    class="text-xs font-semibold truncate"
                    :title="s.receiverUsername"
                  >
                    {{ s.receiverUsername }}
                  </h3>
                  <p class="text-[11px] text-muted truncate">
                    Envoyée le {{ formatDate(s.createdAt) }}
                  </p>
                </div>
              </NuxtLink>
              <button
                class="w-full py-2 text-xs font-medium text-error hover:bg-error-50/40 dark:hover:bg-error-950/40 transition-colors flex items-center justify-center gap-1 border-t border-default"
                @click="removeFriendship(s.receiverId, `Annuler la demande à ${s.receiverUsername}`)"
              >
                <UIcon
                  name="i-lucide-x"
                  class="size-3.5"
                />
                Annuler la demande
              </button>
            </div>
          </div>
        </div>
      </template>
    </UTabs>

    <FriendRequestModal
      v-model:open="showAddModal"
      @sent="() => { load(); activeTab = 'sent' }"
    />
  </div>
</template>
