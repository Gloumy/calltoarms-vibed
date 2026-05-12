// https://nuxt.com/docs/api/configuration/nuxt-config
import { execSync } from 'node:child_process'

// Identifiant de build figé au moment de `nuxt build` (ou `nuxt dev`).
// Affiché en pied de sidebar pour vérifier qu'une mise à jour PWA a bien
// remplacé les assets après acceptation de la bannière.
function resolveAppVersion(): string {
  try {
    const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    return sha || 'dev'
  } catch {
    return 'dev'
  }
}

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vite-pwa/nuxt'
  ],

  ssr: false,

  // Tags injectés dans le HTML statique (avant hydratation). Avec ssr: false,
  // useHead() dans app.vue ne s'exécute qu'après hydration — trop tard pour
  // que le navigateur découvre le manifest et propose l'install PWA.
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#534AB7' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Call to Arms' }
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icon-192.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }
      ]
    }
  },

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
      vapidPublicKey: '',
      appVersion: resolveAppVersion()
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
    // 'prompt' au lieu de 'autoUpdate' : on attend que l'utilisateur clique
    // sur la bannière (PwaUpdatePrompt) avant d'activer le nouveau SW et
    // recharger, sinon on risque de l'interrompre en pleine action.
    registerType: 'prompt',
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
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    devOptions: {
      enabled: true,
      type: 'module',
      navigateFallback: '/'
    }
  }
})
