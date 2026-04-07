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
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    databaseUrl: process.env.DATABASE_URL,
    twitchClientId: process.env.TWITCH_CLIENT_ID,
    twitchClientSecret: process.env.TWITCH_CLIENT_SECRET,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    vapidEmail: process.env.VAPID_EMAIL,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    public: {
      vapidPublicKey: process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY
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
