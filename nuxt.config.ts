// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    ...(process.env.NODE_ENV === 'production' ? ['@vite-pwa/nuxt'] : [])
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  ssr: false,

  components: [
    { path: '~/components', pathPrefix: false }
  ],

  compatibilityDate: '2025-01-15',

  // Nitro server config
  nitro: {
    experimental: {
      websocket: true
    }
  },

  // Runtime config (env vars)
  runtimeConfig: {
    baseUrl: '',
    databaseUrl: '',
    twitchClientId: '',
    twitchClientSecret: '',
    vapidPrivateKey: '',
    vapidEmail: '',
    betterAuthSecret: '',
    public: {
      vapidPublicKey: ''
    }
  },

  // PWA config
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Call to Arms',
      short_name: 'CallToArms',
      description: 'Notifie tes amis quand tu veux jouer',
      theme_color: '#534AB7',
      background_color: '#0a0a0a',
      display: 'standalone',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    },
    devOptions: {
      enabled: false
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
