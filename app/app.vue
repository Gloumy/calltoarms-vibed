<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
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
