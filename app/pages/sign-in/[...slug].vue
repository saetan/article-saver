<script setup lang="ts">
useSeoMeta({
  title: 'Sign in'
})

const route = useRoute()
const sessionExpired = computed(() => route.query.reason === 'session-expired')
</script>

<template>
  <UContainer class="flex min-h-screen flex-col items-center justify-center gap-4 py-12">
    <UAlert
      v-if="sessionExpired"
      color="warning"
      variant="subtle"
      title="Your session ended"
      description="Please sign in again."
      class="max-w-sm"
    />
    <SignIn />
  </UContainer>
</template>
