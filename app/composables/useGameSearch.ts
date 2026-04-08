import { useDebounceFn } from '@vueuse/core'

export const useGameSearch = () => {
  const results = ref<any[]>([])
  const loading = ref(false)

  const search = useDebounceFn(async (q: string) => {
    if (!q || q.length < 2) {
      results.value = []
      return
    }
    loading.value = true
    try {
      results.value = await $fetch<any[]>('/api/games/search', { query: { q } })
    } catch {
      results.value = []
    } finally {
      loading.value = false
    }
  }, 350)

  const clear = () => {
    results.value = []
    loading.value = false
  }

  return { results, loading, search, clear }
}
