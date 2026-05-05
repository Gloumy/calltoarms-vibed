// Better-auth's wildcard handler returns a Response object, so Nitro types
// `$fetch('/api/auth/...')` as Response. Wrap with an explicit shape.
type AuthUser = { id: string, username: string, email: string, name: string, image: string | null, isAdmin?: boolean, avatarUrl?: string | null }
type AuthSession = { id: string, userId: string, expiresAt: string }
type AuthPayload = { user: AuthUser, session: AuthSession } | null

export const useAuth = () => {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const session = useState<AuthSession | null>('auth-session', () => null)
  const loading = useState('auth-loading', () => false)

  const fetchUser = async () => {
    loading.value = true
    try {
      const data = await $fetch<AuthPayload>('/api/auth/get-session', {
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
    const data = await $fetch<AuthPayload>('/api/auth/sign-in-flexible', {
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
    const data = await $fetch<AuthPayload>('/api/auth/sign-up/email', {
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
