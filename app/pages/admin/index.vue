<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const activeTab = ref('users')
const loading = ref(true)
const isAdmin = ref(false)

// Users
const users = ref<any[]>([])
const deletingUser = ref<string | null>(null)

// Communities
const commus = ref<any[]>([])
const deletingCommu = ref<string | null>(null)

async function checkAdmin() {
  try {
    const me = await $fetch<any>('/api/users/me')
    isAdmin.value = me.isAdmin
  } catch {
    isAdmin.value = false
  }
  loading.value = false
}

async function fetchUsers() {
  try {
    users.value = await $fetch('/api/admin/users')
  } catch {
    users.value = []
  }
}

async function fetchCommunities() {
  try {
    commus.value = await $fetch('/api/admin/communities')
  } catch {
    commus.value = []
  }
}

async function deleteUser(userId: string) {
  deletingUser.value = userId
  try {
    await $fetch('/api/admin/users', {
      method: 'DELETE',
      body: { userId }
    })
    users.value = users.value.filter(u => u.id !== userId)
  } finally {
    deletingUser.value = null
  }
}

async function deleteCommunity(communityId: string) {
  deletingCommu.value = communityId
  try {
    await $fetch('/api/admin/communities', {
      method: 'DELETE',
      body: { communityId }
    })
    commus.value = commus.value.filter(c => c.id !== communityId)
  } finally {
    deletingCommu.value = null
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

onMounted(async () => {
  await checkAdmin()
  if (isAdmin.value) {
    fetchUsers()
    fetchCommunities()
  }
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">
      Administration
    </h1>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
    </div>

    <div v-else-if="!isAdmin" class="text-center py-12">
      <UIcon name="i-lucide-shield-x" class="size-12 text-red-500 mx-auto mb-3" />
      <p class="text-muted">
        Acces reserve aux administrateurs.
      </p>
    </div>

    <template v-else>
      <!-- Tabs -->
      <div class="flex gap-2 mb-6 flex-wrap">
        <UButton
          label="Utilisateurs"
          icon="i-lucide-users"
          :variant="activeTab === 'users' ? 'solid' : 'outline'"
          :color="activeTab === 'users' ? 'primary' : 'neutral'"
          size="sm"
          @click="activeTab = 'users'"
        />
        <UButton
          label="Communautes"
          icon="i-lucide-globe"
          :variant="activeTab === 'communities' ? 'solid' : 'outline'"
          :color="activeTab === 'communities' ? 'primary' : 'neutral'"
          size="sm"
          @click="activeTab = 'communities'"
        />
      </div>

      <!-- Users tab -->
      <div v-if="activeTab === 'users'">
        <div class="rounded-lg border border-default overflow-x-auto">
          <table class="w-full min-w-[640px] text-sm">
            <thead class="bg-elevated">
              <tr>
                <th class="text-left px-4 py-2 font-medium text-muted">Utilisateur</th>
                <th class="text-left px-4 py-2 font-medium text-muted">Email</th>
                <th class="text-center px-4 py-2 font-medium text-muted">Amis</th>
                <th class="text-center px-4 py-2 font-medium text-muted">Sessions</th>
                <th class="text-left px-4 py-2 font-medium text-muted">Inscrit le</th>
                <th class="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="u in users"
                :key="u.id"
                class="border-t border-default"
              >
                <td class="px-4 py-2">
                  <div class="flex items-center gap-2">
                    <UAvatar :src="u.image ?? undefined" :alt="u.username" size="2xs" />
                    <span>{{ u.username }}</span>
                    <UBadge v-if="u.is_admin" color="warning" variant="subtle" size="xs">
                      Admin
                    </UBadge>
                  </div>
                </td>
                <td class="px-4 py-2 text-muted">{{ u.email }}</td>
                <td class="px-4 py-2 text-center">{{ u.friend_count }}</td>
                <td class="px-4 py-2 text-center">{{ u.session_count }}</td>
                <td class="px-4 py-2 text-muted">{{ formatDate(u.created_at) }}</td>
                <td class="px-4 py-2 text-right">
                  <UButton
                    v-if="!u.is_admin"
                    icon="i-lucide-trash-2"
                    variant="ghost"
                    color="error"
                    size="xs"
                    :loading="deletingUser === u.id"
                    @click="deleteUser(u.id)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Communities tab -->
      <div v-if="activeTab === 'communities'">
        <div class="rounded-lg border border-default overflow-x-auto">
          <table class="w-full min-w-[640px] text-sm">
            <thead class="bg-elevated">
              <tr>
                <th class="text-left px-4 py-2 font-medium text-muted">Communaute</th>
                <th class="text-left px-4 py-2 font-medium text-muted">Createur</th>
                <th class="text-center px-4 py-2 font-medium text-muted">Membres</th>
                <th class="text-center px-4 py-2 font-medium text-muted">Publique</th>
                <th class="text-left px-4 py-2 font-medium text-muted">Creee le</th>
                <th class="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in commus"
                :key="c.id"
                class="border-t border-default"
              >
                <td class="px-4 py-2 font-medium">
                  <NuxtLink :to="`/communities/${c.id}`" class="hover:text-violet-500">
                    {{ c.name }}
                  </NuxtLink>
                </td>
                <td class="px-4 py-2 text-muted">{{ c.creator_name }}</td>
                <td class="px-4 py-2 text-center">{{ c.member_count }}</td>
                <td class="px-4 py-2 text-center">
                  <UIcon
                    :name="c.is_public ? 'i-lucide-check' : 'i-lucide-x'"
                    :class="c.is_public ? 'text-green-500' : 'text-red-500'"
                    class="size-4"
                  />
                </td>
                <td class="px-4 py-2 text-muted">{{ formatDate(c.created_at) }}</td>
                <td class="px-4 py-2 text-right">
                  <UButton
                    icon="i-lucide-trash-2"
                    variant="ghost"
                    color="error"
                    size="xs"
                    :loading="deletingCommu === c.id"
                    @click="deleteCommunity(c.id)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
