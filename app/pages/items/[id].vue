<script setup lang="ts">
import type { Item } from '~~/server/db/schema/types'

type ReaderItem = Omit<Item, 'createdAt' | 'updatedAt' | 'publishedAt'> & {
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

const route = useRoute()
const itemUrl = computed(() => `/api/items/${encodeURIComponent(String(route.params.id ?? ''))}`)

const {
  data: item,
  status: loadStatus,
  error,
  refresh
} = await useFetch<ReaderItem>(itemUrl)

useSeoMeta({
  title: () => item.value?.title || 'Read saved item'
})

const articleHtml = computed(() => item.value?.contentHtml?.trim() || null)
const articleText = computed(() => item.value?.contentText?.trim() || item.value?.pastedText?.trim() || null)
const isNotFound = computed(() => error.value?.statusCode === 404)
const isError = computed(() => loadStatus.value === 'error')

function formatDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { dateStyle: 'long' })
}

const publishedDate = computed(() => formatDate(item.value?.publishedAt))
const savedDate = computed(() => formatDate(item.value?.createdAt))
</script>

<template>
  <UContainer class="py-8 sm:py-12">
    <div class="mx-auto max-w-3xl">
      <NuxtLink
        to="/"
        class="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-primary"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        Back to library
      </NuxtLink>

      <UCard v-if="loadStatus === 'pending'">
        <div class="animate-pulse space-y-5">
          <div class="h-3 w-28 rounded bg-elevated" />
          <div class="h-10 w-4/5 rounded bg-elevated" />
          <div class="h-4 w-2/5 rounded bg-elevated" />
          <div class="mt-10 space-y-3">
            <div class="h-4 rounded bg-elevated" />
            <div class="h-4 rounded bg-elevated" />
            <div class="h-4 w-5/6 rounded bg-elevated" />
          </div>
        </div>
      </UCard>

      <UCard v-else-if="isError">
        <div class="py-8 text-center">
          <UIcon
            :name="isNotFound ? 'i-lucide-book-x' : 'i-lucide-cloud-alert'"
            class="mx-auto size-10 text-muted"
          />
          <h1 class="mt-4 font-semibold text-highlighted">
            {{ isNotFound ? 'This saved item isn’t here' : 'We couldn’t open this item' }}
          </h1>
          <p class="mt-2 text-sm text-muted">
            {{
              isNotFound
                ? 'It may have been removed, or it may not belong to this library.'
                : 'Please try loading it again.'
            }}
          </p>
          <div class="mt-5 flex justify-center gap-3">
            <UButton v-if="!isNotFound" variant="outline" @click="refresh()">Try again</UButton>
            <UButton to="/" icon="i-lucide-library">Return to library</UButton>
          </div>
        </div>
      </UCard>

      <article v-else-if="item" class="overflow-hidden rounded-xl border border-default bg-default">
        <header class="border-b border-default bg-elevated/40 px-5 py-8 sm:px-10 sm:py-12">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {{ item.siteName || item.type.replaceAll('_', ' ') }}
          </p>
          <h1 class="mt-4 text-3xl font-semibold leading-tight tracking-tight text-highlighted sm:text-4xl">
            {{ item.title || item.url }}
          </h1>
          <p v-if="item.excerpt" class="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
            {{ item.excerpt }}
          </p>

          <div class="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span v-if="item.author">{{ item.author }}</span>
            <span v-if="item.author && (publishedDate || savedDate)" aria-hidden="true">·</span>
            <time v-if="publishedDate" :datetime="item.publishedAt ?? undefined">
              {{ publishedDate }}
            </time>
            <span v-else-if="savedDate">Saved {{ savedDate }}</span>
          </div>

          <ULink
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-7 inline-flex items-center gap-2 rounded-full border border-default bg-default px-4 py-2 text-sm font-medium text-highlighted transition-colors hover:border-primary/40 hover:text-primary"
          >
            Read on {{ item.siteName || 'original site' }}
            <UIcon name="i-lucide-arrow-up-right" class="size-4" />
          </ULink>
        </header>

        <div class="px-5 py-8 sm:px-10 sm:py-12">
          <!-- eslint-disable-next-line vue/no-v-html, better-tailwindcss/no-unknown-classes -->
          <div v-if="articleHtml" class="reader-content" v-html="articleHtml" />
          <!-- eslint-disable-next-line better-tailwindcss/no-unknown-classes -->
          <div v-else-if="articleText" class="reader-text">{{ articleText }}</div>
          <div v-else class="rounded-lg border border-dashed border-default bg-elevated/30 px-5 py-8">
            <div class="flex items-start gap-3">
              <UIcon
                :name="item.extractionStatus === 'failed' ? 'i-lucide-file-warning' : 'i-lucide-book-open'"
                class="mt-0.5 size-5 shrink-0 text-muted"
              />
              <div>
                <h2 class="font-medium text-highlighted">
                  {{ item.extractionStatus === 'failed' ? 'The article text wasn’t captured' : 'No article text saved' }}
                </h2>
                <p class="mt-1 text-sm leading-relaxed text-muted">
                  {{
                    item.extractionStatus === 'failed'
                      ? 'You can still open the original page using the link above.'
                      : item.extractionStatus === 'pending'
                        ? 'This page is still being prepared. Check back in a little while, or read it at the original source.'
                        : 'There isn’t captured text for this item. The original page is still available.'
                  }}
                </p>
                <p
                  v-if="item.extractionStatus === 'failed' && item.extractionError"
                  class="mt-2 text-sm text-muted"
                >
                  {{ item.extractionError }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  </UContainer>
</template>

<style scoped>
.reader-content,
.reader-text {
  color: var(--ui-text);
  font-size: 1.0625rem;
  line-height: 1.85;
  overflow-wrap: anywhere;
}

.reader-text {
  white-space: pre-wrap;
}

.reader-content :deep(p) {
  margin: 0 0 1.35em;
}

.reader-content :deep(h1),
.reader-content :deep(h2),
.reader-content :deep(h3),
.reader-content :deep(h4) {
  margin: 1.8em 0 0.65em;
  color: var(--ui-text-highlighted);
  font-weight: 650;
  line-height: 1.3;
}

.reader-content :deep(h1) {
  font-size: 1.8rem;
}

.reader-content :deep(h2) {
  font-size: 1.5rem;
}

.reader-content :deep(h3),
.reader-content :deep(h4) {
  font-size: 1.2rem;
}

.reader-content :deep(a) {
  color: var(--ui-primary);
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.reader-content :deep(blockquote) {
  margin: 1.6em 0;
  border-left: 3px solid var(--ui-primary);
  padding-left: 1.1rem;
  color: var(--ui-text-muted);
}

.reader-content :deep(ul),
.reader-content :deep(ol) {
  margin: 1em 0 1.4em;
  padding-left: 1.5em;
}

.reader-content :deep(ul) {
  list-style: disc;
}

.reader-content :deep(ol) {
  list-style: decimal;
}

.reader-content :deep(li + li) {
  margin-top: 0.35em;
}

.reader-content :deep(img) {
  max-width: 100%;
  height: auto;
  margin: 1.5rem auto;
  border-radius: 0.5rem;
}

.reader-content :deep(figure) {
  margin: 1.5rem 0;
}

.reader-content :deep(figcaption) {
  margin-top: 0.5rem;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  text-align: center;
}

.reader-content :deep(pre) {
  max-width: 100%;
  overflow-x: auto;
  border-radius: 0.5rem;
  background: var(--ui-bg-elevated);
  padding: 1rem;
  font-size: 0.9rem;
}

.reader-content :deep(code),
.reader-content :deep(kbd) {
  border-radius: 0.25rem;
  background: var(--ui-bg-elevated);
  padding: 0.12em 0.3em;
  font-size: 0.9em;
}

.reader-content :deep(pre code) {
  background: transparent;
  padding: 0;
}

.reader-content :deep(hr) {
  margin: 2rem 0;
  border-color: var(--ui-border);
}

.reader-content :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.reader-content :deep(th),
.reader-content :deep(td) {
  border: 1px solid var(--ui-border);
  padding: 0.55rem 0.75rem;
  text-align: left;
}
</style>
