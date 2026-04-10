import { useDebounceFn } from '@vueuse/core'

export const useGameSearch = () => {
  const results = ref<any[]>([])
  const loading = ref(false)
  let requestId = 0

  const search = useDebounceFn(async (q: string) => {
    if (!q || q.length < 2) {
      results.value = []
      return
    }
    loading.value = true
    const thisRequest = ++requestId
    try {
      const data = await $fetch<any[]>('/api/games/search', { query: { q } })
      // Only apply results if this is still the latest request
      if (thisRequest === requestId) {
        results.value = data
      }
    } catch {
      if (thisRequest === requestId) {
        results.value = []
      }
    } finally {
      if (thisRequest === requestId) {
        loading.value = false
      }
    }
  }, 350)

  const clear = () => {
    requestId++
    results.value = []
    loading.value = false
  }

  return { results, loading, search, clear }
}
