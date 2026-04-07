// Abstraction over better-auth — never call better-auth directly in pages/components.
// All auth logic goes through this composable to facilitate future migration.

export const useAuth = () => {
  const user = useState<any>('auth-user', () => null)

  const signIn = async (_email: string, _password: string) => {
    // TODO Phase 2: integrate better-auth
  }

  const signOut = async () => {
    // TODO Phase 2: integrate better-auth
    user.value = null
    navigateTo('/auth/login')
  }

  const register = async (_email: string, _username: string, _password: string) => {
    // TODO Phase 2: integrate better-auth
  }

  const fetchUser = async () => {
    // TODO Phase 2: fetch current session from better-auth
  }

  return { user, signIn, signOut, register, fetchUser }
}
