<script setup lang="ts">
const { isSignedIn } = useAuth()

useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title: 'Article Saver',
  description:
    'A personal read-it-later app for web articles, PDFs, and posts from X, Threads and Instagram.'
})
</script>

<template>
  <UApp>
    <UHeader title="Article Saver">
      <template #right>
        <UserButton v-if="isSignedIn" />
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>
  </UApp>
</template>
