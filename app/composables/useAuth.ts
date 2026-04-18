export const useAuth = () => {
  const user = useState<any>('auth-user', () => null)
  const session = useState<any>('auth-session', () => null)
  const loading = useState('auth-loading', () => false)

  const fetchUser = async () => {
    loading.value = true
    try {
      const data = await $fetch('/api/auth/get-session', {
        headers: import.meta.server ? useRequestHeaders(['cookie']) : {}
      })
      if (data?.user) {
        user.value = data.user
        session.value = data.session
      } else {
        user.value = null
        session.value = null
      }
    } catch {
      user.value = null
      session.value = null
    } finally {
      loading.value = false
    }
  }

  const signIn = async (identifier: string, password: string) => {
    const data = await $fetch('/api/auth/sign-in-flexible', {
      method: 'POST',
      body: { identifier, password }
    })
    if (!data?.user) {
      throw new Error('Identifiants invalides')
    }
    user.value = data.user
    session.value = data.session
    return data
  }

  const register = async (email: string, username: string, password: string) => {
    const data = await $fetch('/api/auth/sign-up/email', {
      method: 'POST',
      body: { email, password, name: username, username }
    })
    if (!data?.user) {
      throw new Error('Erreur lors de l\'inscription')
    }
    user.value = data.user
    session.value = data.session
    return data
  }

  const signOut = async () => {
    await $fetch('/api/auth/sign-out', {
      method: 'POST',
      body: {}
    })
    user.value = null
    session.value = null
    navigateTo('/auth/login')
  }

  const isAuthenticated = computed(() => !!user.value)

  return {
    user,
    session,
    loading,
    isAuthenticated,
    fetchUser,
    signIn,
    register,
    signOut
  }
}
