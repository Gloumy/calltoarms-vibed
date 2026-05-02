<script setup lang="ts">
const emit = defineEmits<{
  connected: []
}>()

const toast = useToast()
const npsso = ref('')
const username = ref('')
const submitting = ref(false)

async function submit() {
  const trimmed = npsso.value.trim()
  if (!trimmed) {
    toast.add({ title: 'Erreur', description: 'NPSSO requis', color: 'error' })
    return
  }
  submitting.value = true
  try {
    await $fetch('/api/platforms/playstation/auth', {
      method: 'POST',
      body: { npsso: trimmed, username: username.value.trim() || undefined }
    })
    toast.add({ title: 'PlayStation connecté', description: 'Lance une synchronisation pour récupérer ta bibliothèque.', color: 'success' })
    npsso.value = ''
    username.value = ''
    emit('connected')
  } catch (err: unknown) {
    const message = (err as { data?: { statusMessage?: string }, statusMessage?: string })?.data?.statusMessage
      ?? (err as { statusMessage?: string })?.statusMessage
      ?? 'Échec de la connexion PlayStation'
    toast.add({ title: 'Erreur', description: message, color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="rounded-lg border border-default bg-default p-8 max-w-xl mx-auto">
    <div class="text-center mb-6">
      <UIcon
        name="i-simple-icons-playstation"
        class="size-12 text-muted mx-auto mb-3"
      />
      <h2 class="text-lg font-semibold mb-2">
        Connecte ton compte PlayStation
      </h2>
      <p class="text-sm text-muted">
        Pour récupérer tes jeux et trophées, on a besoin de ton token NPSSO.
      </p>
    </div>

    <div class="rounded-md bg-elevated p-4 mb-6 text-xs text-muted space-y-2">
      <p class="font-semibold text-default">
        Comment récupérer le NPSSO ?
      </p>
      <ol class="list-decimal list-inside space-y-1">
        <li>
          Connecte-toi à <a
            href="https://www.playstation.com/"
            target="_blank"
            class="underline text-violet-500"
          >playstation.com</a> dans le même navigateur.
        </li>
        <li>
          Une fois connecté, ouvre <a
            href="https://ca.account.sony.com/api/v1/ssocookie"
            target="_blank"
            class="underline text-violet-500"
          >ce lien</a>.
        </li>
        <li>Copie la valeur de <code class="text-default">npsso</code> (chaîne de 64 caractères).</li>
      </ol>
      <p>Ce token reste valide environ 2 mois.</p>
    </div>

    <form
      class="space-y-3"
      @submit.prevent="submit"
    >
      <UInput
        v-model="username"
        placeholder="Pseudo PSN (optionnel)"
        size="lg"
        class="w-full"
      />
      <UInput
        v-model="npsso"
        placeholder="Token NPSSO"
        type="password"
        size="lg"
        class="w-full"
        :ui="{ base: 'font-mono' }"
      />
      <UButton
        type="submit"
        label="Connecter PlayStation"
        icon="i-simple-icons-playstation"
        size="lg"
        block
        :loading="submitting"
      />
    </form>
  </div>
</template>
