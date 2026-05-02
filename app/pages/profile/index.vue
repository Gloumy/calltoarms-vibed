<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { user: authUser, fetchUser } = useAuth()

const profile = ref<any>(null)
const loading = ref(true)

// Edit mode
const editing = ref(false)
const editUsername = ref('')
const editImage = ref('')
const saving = ref(false)
const editError = ref('')
const uploadingAvatar = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)

// Battle tags
const newPlatform = ref('')
const newTag = ref('')
const addingTag = ref(false)

const platformOptions = [
  { label: 'Steam', value: 'steam', icon: 'i-simple-icons-steam' },
  { label: 'Discord', value: 'discord', icon: 'i-simple-icons-discord' },
  { label: 'Battle.net', value: 'battlenet', icon: 'i-simple-icons-battledotnet' },
  { label: 'Epic Games', value: 'epic', icon: 'i-simple-icons-epicgames' },
  { label: 'Riot Games', value: 'riot', icon: 'i-simple-icons-riotgames' },
  { label: 'PlayStation', value: 'playstation', icon: 'i-simple-icons-playstation' },
  { label: 'Xbox', value: 'xbox', icon: 'i-simple-icons-xbox' },
  { label: 'Nintendo', value: 'nintendo', icon: 'i-simple-icons-nintendo' }
]

async function fetchProfile() {
  try {
    profile.value = await $fetch('/api/users/profile')
  } catch {
    profile.value = null
  } finally {
    loading.value = false
  }
}

function startEdit() {
  editUsername.value = profile.value?.user?.username ?? ''
  editImage.value = profile.value?.user?.image ?? ''
  editError.value = ''
  editing.value = true
}

async function saveProfile() {
  saving.value = true
  editError.value = ''
  try {
    await $fetch('/api/users/profile', {
      method: 'PATCH',
      body: {
        username: editUsername.value,
        image: editImage.value
      }
    })
    editing.value = false
    await fetchProfile()
    await fetchUser()
  } catch (e: any) {
    editError.value = e.data?.statusMessage || 'Erreur lors de la sauvegarde'
  } finally {
    saving.value = false
  }
}

async function addBattleTag() {
  if (!newPlatform.value || !newTag.value.trim()) return
  addingTag.value = true
  try {
    await $fetch('/api/users/battle-tags', {
      method: 'POST',
      body: {
        platform: newPlatform.value,
        tag: newTag.value.trim()
      }
    })
    newPlatform.value = ''
    newTag.value = ''
    await fetchProfile()
  } finally {
    addingTag.value = false
  }
}

async function removeBattleTag(id: string) {
  await $fetch('/api/users/battle-tags', {
    method: 'DELETE',
    body: { id }
  })
  await fetchProfile()
}

async function uploadAvatar(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadingAvatar.value = true
  try {
    const form = new FormData()
    form.append('avatar', file)
    const result = await $fetch<{ url: string }>('/api/users/avatar', {
      method: 'POST',
      body: form
    })
    // Update local state
    if (profile.value?.user) {
      profile.value.user.image = result.url
    }
    editImage.value = result.url
    await fetchUser()
  } catch (err: any) {
    editError.value = err.data?.statusMessage || 'Erreur lors de l\'upload'
  } finally {
    uploadingAvatar.value = false
    if (input) input.value = ''
  }
}

function platformIcon(platform: string) {
  return platformOptions.find(p => p.value === platform)?.icon ?? 'i-lucide-gamepad-2'
}

function platformLabel(platform: string) {
  return platformOptions.find(p => p.value === platform)?.label ?? platform
}

const memberSince = computed(() => {
  if (!profile.value?.user?.createdAt) return ''
  return new Date(profile.value.user.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})

onMounted(() => {
  fetchProfile()
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">
      Profil
    </h1>

    <div
      v-if="loading"
      class="flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-6 animate-spin text-muted"
      />
    </div>

    <template v-else-if="profile">
      <!-- Profile card -->
      <div class="rounded-lg border border-default p-4 sm:p-6 mb-6">
        <div
          v-if="!editing"
          class="flex items-center gap-3 sm:gap-4 flex-wrap"
        >
          <div
            class="relative group cursor-pointer"
            @click="avatarInput?.click()"
          >
            <UAvatar
              :src="profile.user.image ?? undefined"
              :alt="profile.user.username"
              size="xl"
            />
            <div class="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <UIcon
                v-if="!uploadingAvatar"
                name="i-lucide-camera"
                class="size-5 text-white"
              />
              <UIcon
                v-else
                name="i-lucide-loader-2"
                class="size-5 text-white animate-spin"
              />
            </div>
            <input
              ref="avatarInput"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="hidden"
              @change="uploadAvatar"
            >
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-xl font-bold truncate">
              {{ profile.user.username }}
            </h2>
            <p class="text-sm text-muted truncate">
              {{ profile.user.email }}
            </p>
            <p class="text-xs text-muted mt-1">
              Membre depuis {{ memberSince }}
            </p>
          </div>
          <UButton
            label="Modifier"
            icon="i-lucide-pencil"
            variant="outline"
            color="neutral"
            size="sm"
            @click="startEdit"
          />
        </div>

        <!-- Edit form -->
        <div
          v-else
          class="space-y-4"
        >
          <div class="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div
              class="relative group cursor-pointer"
              @click="avatarInput?.click()"
            >
              <UAvatar
                :src="editImage || undefined"
                :alt="editUsername"
                size="xl"
              />
              <div class="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <UIcon
                  v-if="!uploadingAvatar"
                  name="i-lucide-camera"
                  class="size-5 text-white"
                />
                <UIcon
                  v-else
                  name="i-lucide-loader-2"
                  class="size-5 text-white animate-spin"
                />
              </div>
              <input
                ref="avatarInput"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                class="hidden"
                @change="uploadAvatar"
              >
            </div>
            <div class="flex-1 min-w-0 space-y-3 basis-full sm:basis-0">
              <UFormField
                label="Pseudo"
                name="username"
              >
                <UInput
                  v-model="editUsername"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
          <UAlert
            v-if="editError"
            color="error"
            :title="editError"
            icon="i-lucide-alert-circle"
          />
          <div class="flex gap-2 justify-end">
            <UButton
              label="Annuler"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="editing = false"
            />
            <UButton
              label="Sauvegarder"
              icon="i-lucide-check"
              size="sm"
              :loading="saving"
              :disabled="!editUsername.trim()"
              @click="saveProfile"
            />
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div class="rounded-lg border border-default p-4 text-center">
          <p class="text-2xl font-bold text-violet-500">
            {{ profile.stats.friend_count }}
          </p>
          <p class="text-xs text-muted">
            Amis
          </p>
        </div>
        <div class="rounded-lg border border-default p-4 text-center">
          <p class="text-2xl font-bold text-violet-500">
            {{ profile.stats.community_count }}
          </p>
          <p class="text-xs text-muted">
            Communautes
          </p>
        </div>
        <div class="rounded-lg border border-default p-4 text-center">
          <p class="text-2xl font-bold text-violet-500">
            {{ profile.stats.session_count }}
          </p>
          <p class="text-xs text-muted">
            Sessions
          </p>
        </div>
        <div class="rounded-lg border border-default p-4 text-center">
          <p class="text-2xl font-bold text-violet-500">
            {{ profile.stats.event_count }}
          </p>
          <p class="text-xs text-muted">
            Evenements
          </p>
        </div>
        <div class="rounded-lg border border-default p-4 text-center">
          <p class="text-2xl font-bold text-violet-500">
            {{ profile.stats.favorite_game_count }}
          </p>
          <p class="text-xs text-muted">
            Jeux favoris
          </p>
        </div>
      </div>

      <!-- Battle tags -->
      <div class="rounded-lg border border-default p-4 sm:p-6">
        <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
          Identifiants de jeu
        </h2>

        <div
          v-if="profile.battleTags.length > 0"
          class="space-y-2 mb-4"
        >
          <div
            v-for="bt in profile.battleTags"
            :key="bt.id"
            class="flex items-center gap-3 px-3 py-2 rounded-md bg-elevated group"
          >
            <UIcon
              :name="platformIcon(bt.platform)"
              class="size-5 shrink-0"
            />
            <span class="text-sm font-medium">{{ platformLabel(bt.platform) }}</span>
            <span class="text-sm text-muted flex-1">{{ bt.tag }}</span>
            <UBadge
              v-if="!bt.is_public"
              color="neutral"
              variant="subtle"
              size="xs"
            >
              Prive
            </UBadge>
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="xs"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              @click="removeBattleTag(bt.id)"
            />
          </div>
        </div>

        <div
          v-else
          class="text-sm text-muted mb-4"
        >
          Aucun identifiant ajoute.
        </div>

        <!-- Add battle tag -->
        <div class="flex flex-wrap gap-2">
          <select
            v-model="newPlatform"
            class="rounded-md border border-default bg-default px-3 py-1.5 text-sm"
          >
            <option
              value=""
              disabled
            >
              Plateforme
            </option>
            <option
              v-for="p in platformOptions"
              :key="p.value"
              :value="p.value"
            >
              {{ p.label }}
            </option>
          </select>
          <UInput
            v-model="newTag"
            placeholder="Votre pseudo/tag"
            size="sm"
            class="flex-1 min-w-[150px]"
          />
          <UButton
            label="Ajouter"
            icon="i-lucide-plus"
            size="sm"
            :loading="addingTag"
            :disabled="!newPlatform || !newTag.trim()"
            @click="addBattleTag"
          />
        </div>
      </div>
    </template>
  </div>
</template>
