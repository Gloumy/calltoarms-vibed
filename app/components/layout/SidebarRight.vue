<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'sidebar' | 'drawer'
}>(), {
  variant: 'sidebar'
})

// State partagé via useFriendsList — l'init (fetch initial, WS, polling) est
// faite par le layout, le composant lit juste le state et n'a aucun fetch
// au mount. Donc rouvrir le drawer mobile n'entraîne aucun rechargement.
const {
  friends,
  mySessionId,
  pendingRequests,
  respondToRequest,
  toggleNotif,
  fetchPending
} = useFriendsList()

const showAddFriend = ref(false)
const showExpanded = ref(false)

const inSessionFriends = computed(() =>
  friends.value.filter(f => f.inSession)
)

const playingFriends = computed(() =>
  friends.value.filter(f => !f.inSession && f.isAvailable && f.availableGameId)
)

const availableFriends = computed(() =>
  friends.value.filter(f => !f.inSession && f.isAvailable && !f.availableGameId)
)

const onlineFriends = computed(() =>
  friends.value.filter(f => !f.inSession && !f.isAvailable && f.isOnline)
)

const offlineFriends = computed(() =>
  friends.value.filter(f => !f.inSession && !f.isAvailable && !f.isOnline)
)

const rootClass = computed(() =>
  props.variant === 'drawer'
    ? 'w-full h-full overflow-y-auto bg-default'
    : 'w-[210px] shrink-0 border-l border-default h-screen sticky top-0 overflow-y-auto'
)
</script>

<template>
  <aside :class="rootClass">
    <div class="px-4 py-5 flex items-center justify-between">
      <h3 class="text-xs font-semibold uppercase text-muted tracking-wider">
        Amis
      </h3>
      <div class="flex items-center gap-1">
        <UButton
          icon="i-lucide-user-plus"
          variant="ghost"
          color="neutral"
          size="xs"
          title="Ajouter un ami"
          @click="showAddFriend = true"
        />
        <UButton
          icon="i-lucide-maximize-2"
          variant="ghost"
          color="neutral"
          size="xs"
          title="Gérer mes amis"
          @click="showExpanded = true"
        />
      </div>
    </div>

    <!-- Pending requests -->
    <div
      v-if="pendingRequests.length > 0"
      class="px-4 mb-4"
    >
      <h4 class="text-xs font-semibold text-muted mb-2">
        Demandes ({{ pendingRequests.length }})
      </h4>
      <div
        v-for="req in pendingRequests"
        :key="req.senderId"
        class="flex items-center gap-2 py-1.5"
      >
        <UAvatar
          :src="req.senderImage ?? undefined"
          :alt="req.senderUsername"
          size="xs"
        />
        <span class="text-sm flex-1 truncate">{{ req.senderUsername }}</span>
        <UButton
          icon="i-lucide-check"
          variant="ghost"
          color="primary"
          size="xs"
          @click="respondToRequest(req.senderId, 'accept')"
        />
        <UButton
          icon="i-lucide-x"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="respondToRequest(req.senderId, 'reject')"
        />
      </div>
    </div>

    <!-- In session -->
    <div
      v-if="inSessionFriends.length > 0"
      class="mb-3"
    >
      <h4 class="px-4 text-xs font-semibold text-muted mb-1">
        En session — {{ inSessionFriends.length }}
      </h4>
      <FriendRow
        v-for="f in inSessionFriends"
        :key="f.id"
        :friend="f"
        :my-session-id="mySessionId"
        status="in_session"
        @toggle-notif="toggleNotif"
      />
    </div>

    <!-- Playing -->
    <div
      v-if="playingFriends.length > 0"
      class="mb-3"
    >
      <h4 class="px-4 text-xs font-semibold text-muted mb-1">
        En jeu — {{ playingFriends.length }}
      </h4>
      <FriendRow
        v-for="f in playingFriends"
        :key="f.id"
        :friend="f"
        status="playing"
        @toggle-notif="toggleNotif"
      />
    </div>

    <!-- Available -->
    <div
      v-if="availableFriends.length > 0"
      class="mb-3"
    >
      <h4 class="px-4 text-xs font-semibold text-muted mb-1">
        Disponibles — {{ availableFriends.length }}
      </h4>
      <FriendRow
        v-for="f in availableFriends"
        :key="f.id"
        :friend="f"
        status="available"
        @toggle-notif="toggleNotif"
      />
    </div>

    <!-- Online -->
    <div
      v-if="onlineFriends.length > 0"
      class="mb-3"
    >
      <h4 class="px-4 text-xs font-semibold text-muted mb-1">
        En ligne — {{ onlineFriends.length }}
      </h4>
      <FriendRow
        v-for="f in onlineFriends"
        :key="f.id"
        :friend="f"
        status="online"
        @toggle-notif="toggleNotif"
      />
    </div>

    <!-- Offline -->
    <div
      v-if="offlineFriends.length > 0"
      class="mb-3"
    >
      <h4 class="px-4 text-xs font-semibold text-muted mb-1">
        Hors ligne — {{ offlineFriends.length }}
      </h4>
      <FriendRow
        v-for="f in offlineFriends"
        :key="f.id"
        :friend="f"
        status="offline"
        @toggle-notif="toggleNotif"
      />
    </div>

    <!-- Empty state -->
    <div
      v-if="friends.length === 0 && pendingRequests.length === 0"
      class="px-4 text-sm text-muted"
    >
      <p>Aucun ami pour l'instant.</p>
      <UButton
        label="Ajouter un ami"
        icon="i-lucide-user-plus"
        variant="outline"
        size="xs"
        class="mt-2"
        @click="showAddFriend = true"
      />
    </div>

    <!-- Add friend modal -->
    <FriendRequestModal
      v-model:open="showAddFriend"
      @sent="fetchPending()"
    />

    <!-- Expanded friends manager -->
    <USlideover
      v-model:open="showExpanded"
      side="right"
      title="Amis"
      :ui="{ content: 'w-full sm:max-w-4xl', body: 'p-4 sm:p-6' }"
    >
      <template #body>
        <FriendsManager :show-header="false" />
      </template>
    </USlideover>
  </aside>
</template>
