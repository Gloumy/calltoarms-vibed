<script setup lang="ts">
const model = defineModel<string>()

withDefaults(defineProps<{
  placeholder?: string
  autocomplete?: string
}>(), {
  placeholder: '••••••••',
  autocomplete: 'current-password'
})

const visible = ref(false)
</script>

<template>
  <UInput
    v-model="model"
    :type="visible ? 'text' : 'password'"
    :placeholder="placeholder"
    :autocomplete="autocomplete"
    icon="i-lucide-lock"
    class="w-full"
  >
    <template #trailing>
      <UButton
        color="neutral"
        variant="link"
        size="sm"
        :icon="visible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
        :aria-label="visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
        tabindex="-1"
        @click="visible = !visible"
      />
    </template>
  </UInput>
</template>
