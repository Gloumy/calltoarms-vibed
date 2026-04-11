<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const route = useRoute()
const code = route.params.code as string

const loading = ref(true)
const error = ref('')
const communityId = ref<string | null>(null)

onMounted(async () => {
  try {
    const result = await $fetch<any>('/api/communities/join-by-code', {
      method: 'POST',
      body: { code }
    })
    communityId.value = result.communityId
    navigateTo(`/communities/${result.communityId}`)
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Lien d\'invitation invalide'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex items-center justify-center py-12">
    <div v-if="loading" class="text-center">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted mb-3" />
      <p class="text-muted">
        Rejoindre la communaute...
      </p>
    </div>
    <div v-else-if="error" class="text-center">
      <UIcon name="i-lucide-alert-circle" class="size-12 text-red-500 mx-auto mb-3" />
      <p class="text-muted mb-4">
        {{ error }}
      </p>
      <UButton label="Retour aux communautes" icon="i-lucide-arrow-left" variant="outline" to="/communities" />
    </div>
  </div>
</template>
