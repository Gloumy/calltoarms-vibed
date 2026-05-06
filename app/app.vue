<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
    { name: 'theme-color', content: '#534AB7' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'apple-mobile-web-app-title', content: 'Call to Arms' }
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
    { rel: 'apple-touch-icon', href: '/logo.png' }
  ],
  htmlAttrs: {
    lang: 'fr'
  }
})

useSeoMeta({
  title: 'Call to Arms',
  description: 'Notifie tes amis quand tu veux lancer une session de jeu.',
  ogTitle: 'Call to Arms',
  ogDescription: 'Notifie tes amis quand tu veux lancer une session de jeu.'
})

const { init: initPwaInstall } = usePwaInstall()
const { checkExisting: checkPushExisting } = usePushNotifications()

onMounted(() => {
  initPwaInstall()
  checkPushExisting()
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
