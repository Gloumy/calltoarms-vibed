<script setup lang="ts">
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
