<script setup lang="ts">
useSeoMeta({
  title: 'Library'
})
</script>

<template>
  <UContainer class="py-12">
    <UPageHeader title="Library" description="Everything you save shows up here." />

    <UPageCard class="mt-8">
      <div class="flex flex-col items-center gap-4 py-12 text-center">
        <UIcon name="i-lucide-library-big" class="size-12 text-muted" />
        <div class="space-y-1">
          <p class="font-medium">Your library is empty</p>
          <p class="text-sm text-muted">
            Saved articles, PDFs and posts will appear here once you start capturing them.
          </p>
        </div>
      </div>
    </UPageCard>
  </UContainer>
</template>
