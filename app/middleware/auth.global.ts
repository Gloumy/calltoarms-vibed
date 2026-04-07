export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser, loading } = useAuth()

  // Fetch user session on first load
  if (user.value === null && !loading.value) {
    await fetchUser()
  }

  const isAuthPage = to.path.startsWith('/auth/')

  // Redirect to home if logged in and trying to access auth pages
  if (isAuthPage && user.value) {
    return navigateTo('/')
  }

  // Redirect to login if not logged in and accessing protected pages
  if (!isAuthPage && !user.value) {
    return navigateTo('/auth/login')
  }
})
