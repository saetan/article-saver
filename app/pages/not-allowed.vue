<script setup lang="ts">
useSeoMeta({
  title: 'Not allowed'
})
</script>

<template>
  <UContainer class="py-12">
    <UPageCard class="mx-auto max-w-md">
      <div class="flex flex-col items-center gap-4 py-12 text-center">
        <UIcon name="i-lucide-lock" class="size-12 text-muted" />
        <div class="space-y-1">
          <p class="font-medium">This account isn't allowed to sign in</p>
          <p class="text-sm text-muted">
            Article Saver is private. If you think this is a mistake, sign out and try a different
            account.
          </p>
        </div>
        <SignOutButton>
          <UButton label="Sign out" color="neutral" variant="subtle" />
        </SignOutButton>
      </div>
    </UPageCard>
  </UContainer>
</template>
