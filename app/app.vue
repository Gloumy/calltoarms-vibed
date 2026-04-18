<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
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
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
