type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const usePwaInstall = () => {
  const installEvent = useState<BeforeInstallPromptEvent | null>('pwa-install-event', () => null)
  const installed = useState('pwa-installed', () => false)

  const isStandalone = computed(() => {
    if (!import.meta.client) return false
    return window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  })

  const isIos = computed(() => {
    if (!import.meta.client) return false
    const ua = window.navigator.userAgent.toLowerCase()
    return /iphone|ipad|ipod/.test(ua)
  })

  const canInstall = computed(() => !!installEvent.value && !isStandalone.value)

  const init = () => {
    if (!import.meta.client) return
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      installEvent.value = e as BeforeInstallPromptEvent
    })
    window.addEventListener('appinstalled', () => {
      installEvent.value = null
      installed.value = true
    })
  }

  const promptInstall = async () => {
    const e = installEvent.value
    if (!e) return false
    await e.prompt()
    const { outcome } = await e.userChoice
    installEvent.value = null
    return outcome === 'accepted'
  }

  return { canInstall, isStandalone, isIos, installed, init, promptInstall }
}
