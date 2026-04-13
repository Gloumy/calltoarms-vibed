<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const communities = ref<any[]>([])
const loading = ref(true)
const showCreateModal = ref(false)

async function fetchCommunities() {
  try {
    communities.value = await $fetch('/api/communities')
  } catch {
    communities.value = []
  } finally {
    loading.value = false
  }
}

const myCommunities = computed(() => communities.value.filter(c => c.is_member))
const invitedCommunities = computed(() => communities.value.filter(c => !c.is_member && c.my_membership_status === 'invited'))
const otherCommunities = computed(() => communities.value.filter(c => !c.is_member && c.my_membership_status !== 'invited'))

onMounted(() => {
  fetchCommunities()
})
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h1 class="text-2xl font-bold">
        Communautes
      </h1>
      <UButton
        label="Creer une communaute"
        icon="i-lucide-plus"
        size="sm"
        @click="showCreateModal = true"
      />
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
    </div>

    <template v-else-if="communities.length === 0">
      <div class="text-center py-12">
        <UIcon name="i-lucide-users" class="size-12 text-muted mx-auto mb-3" />
        <p class="text-muted mb-4">
          Aucune communaute disponible.
        </p>
        <UButton
          label="Creer la premiere"
          icon="i-lucide-plus"
          @click="showCreateModal = true"
        />
      </div>
    </template>

    <template v-else>
      <!-- Pending invitations -->
      <div v-if="invitedCommunities.length > 0" class="mb-8">
        <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          Invitations en attente
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <CommunityCard
            v-for="c in invitedCommunities"
            :key="c.id"
            :community="c"
            invited
          />
        </div>
      </div>

      <!-- My communities -->
      <div v-if="myCommunities.length > 0" class="mb-8">
        <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          Mes communautes
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <CommunityCard
            v-for="c in myCommunities"
            :key="c.id"
            :community="c"
          />
        </div>
      </div>

      <!-- Other communities -->
      <div v-if="otherCommunities.length > 0">
        <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          Decouvrir
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <CommunityCard
            v-for="c in otherCommunities"
            :key="c.id"
            :community="c"
          />
        </div>
      </div>
    </template>

    <CommunityCreateModal
      v-model:open="showCreateModal"
      @created="fetchCommunities()"
    />
  </div>
</template>
