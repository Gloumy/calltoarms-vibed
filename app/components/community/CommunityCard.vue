<script setup lang="ts">
defineProps<{
  community: {
    id: string
    name: string
    slug: string
    description: string | null
    game_name: string | null
    game_cover_url: string | null
    creator_name: string
    member_count: number
    is_member: boolean
    is_public: boolean
  }
  invited?: boolean
}>()
</script>

<template>
  <NuxtLink
    :to="`/communities/${community.id}`"
    class="block h-full rounded-lg border border-default bg-default p-4 hover:border-violet-500/50 transition-colors"
  >
    <div class="flex gap-3">
      <!-- Game thumbnail or community icon -->
      <img
        v-if="community.game_cover_url"
        :src="community.game_cover_url"
        :alt="community.game_name ?? ''"
        class="w-10 h-14 rounded object-cover shrink-0"
      >
      <div
        v-else
        class="w-10 h-14 rounded bg-violet-500/20 text-violet-500 flex items-center justify-center shrink-0"
      >
        <UIcon name="i-lucide-users" class="size-5" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="text-sm font-semibold truncate">{{ community.name }}</h3>
          <UBadge v-if="invited" color="warning" variant="subtle" size="xs">
            Invitation
          </UBadge>
          <UBadge v-else-if="community.is_member" color="success" variant="subtle" size="xs">
            Membre
          </UBadge>
          <UBadge v-if="!community.is_public" color="neutral" variant="subtle" size="xs">
            Privee
          </UBadge>
        </div>

        <p v-if="community.description" class="text-xs text-muted mb-1 line-clamp-2">
          {{ community.description }}
        </p>

        <p class="text-xs text-muted">
          <UIcon name="i-lucide-users" class="size-3 inline-block mr-0.5" />
          {{ community.member_count }} membre{{ community.member_count > 1 ? 's' : '' }}
          <span v-if="community.game_name" class="mx-1">&middot;</span>
          <span v-if="community.game_name">{{ community.game_name }}</span>
        </p>
      </div>
    </div>
  </NuxtLink>
</template>
