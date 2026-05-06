// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vite-pwa/nuxt'
  ],

  ssr: false,

  components: [
    { path: '~/components', pathPrefix: false }
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  // Runtime config (env vars)
  runtimeConfig: {
    baseUrl: '',
    databaseUrl: '',
    twitchClientId: '',
    twitchClientSecret: '',
    vapidPrivateKey: '',
    vapidEmail: '',
    betterAuthSecret: '',
    steamApiKey: '',
    microsoftClientId: '',
    public: {
      vapidPublicKey: ''
    }
  },

  compatibilityDate: '2025-01-15',

  // Nitro server config
  nitro: {
    experimental: {
      websocket: true
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // PWA config
  pwa: {
    registerType: 'autoUpdate',
    strategies: 'injectManifest',
    srcDir: 'service-worker',
    filename: 'sw.ts',
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    },
    manifest: {
      name: 'Call to Arms',
      short_name: 'CallToArms',
      description: 'Notifie tes amis quand tu veux jouer',
      theme_color: '#534AB7',
      background_color: '#0a0a0a',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      id: '/',
      lang: 'fr',
      icons: [
        // TODO: générer icon-192.png et icon-512.png carrés (et un variant maskable)
        // pour une icône d'install propre. logo.png (1408x768) est utilisé en
        // attendant — Chrome l'accepte avec sizes: 'any' mais le rendu n'est pas optimal.
        { src: '/logo.png', sizes: 'any', type: 'image/png', purpose: 'any' }
      ]
    },
    devOptions: {
      enabled: true,
      type: 'module',
      navigateFallback: '/'
    }
  }
})
