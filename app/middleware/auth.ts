export default defineNuxtRouteMiddleware((to) => {
  const { user } = useAuth()

  // Pages publiques (auth)
  if (to.path.startsWith('/auth/')) {
    return
  }

  // Rediriger vers login si non connecté
  if (!user.value) {
    return navigateTo('/auth/login')
  }
})
