<script setup lang="ts">
import type { ItemSummary } from '~~/server/items/item-dto'

useSeoMeta({
  title: 'Library'
})

type ExtractionStatus = ItemSummary['extractionStatus']

// Dates arrive as ISO strings over JSON.
type LibraryItem = Omit<ItemSummary, 'createdAt'> & { createdAt: string }

interface DuplicateInfo {
  existingItemId: string
  savedAt: string
}

const {
  data: items,
  status: loadStatus,
  refresh
} = await useFetch<LibraryItem[]>('/api/items', { default: () => [] })

const url = ref('')
const saving = ref(false)
const validationError = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const duplicate = ref<DuplicateInfo | null>(null)
const duplicateUrl = ref<string | null>(null)

const statusMeta: Record<
  ExtractionStatus,
  { label: string; color: 'warning' | 'error' | 'success' | 'neutral'; icon: string }
> = {
  pending: { label: 'Extracting', color: 'warning', icon: 'i-lucide-loader-circle' },
  failed: { label: 'Failed', color: 'error', icon: 'i-lucide-circle-alert' },
  succeeded: { label: 'Saved', color: 'success', icon: 'i-lucide-circle-check' },
  not_applicable: { label: 'Saved', color: 'neutral', icon: 'i-lucide-bookmark' }
}

const hasPending = computed(() => items.value.some((item) => item.extractionStatus === 'pending'))

// Poll while anything is still extracting; stop as soon as nothing is.
let timer: ReturnType<typeof setInterval> | undefined
watch(
  hasPending,
  (pending) => {
    if (pending && !timer) {
      timer = setInterval(() => refresh(), 2000)
    } else if (!pending && timer) {
      clearInterval(timer)
      timer = undefined
    }
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })

function displayTitle(item: LibraryItem) {
  return item.title || item.url
}

const actionError = ref<string | null>(null)
const retryingId = ref<string | null>(null)
const pasteOpenId = ref<string | null>(null)
const pasteText = ref('')
const pasteSaving = ref(false)

async function retry(item: LibraryItem) {
  actionError.value = null
  retryingId.value = item.id
  try {
    await $fetch(`/api/items/${item.id}/retry`, { method: 'POST' })
    await refresh()
  } catch {
    actionError.value = 'Could not retry that item. Please try again.'
  } finally {
    retryingId.value = null
  }
}

function openPaste(item: LibraryItem) {
  pasteOpenId.value = item.id
  pasteText.value = ''
  actionError.value = null
}

async function savePaste(item: LibraryItem) {
  const text = pasteText.value
  if (!text.trim()) {
    actionError.value = 'Paste some text to save.'
    return
  }
  actionError.value = null
  pasteSaving.value = true
  try {
    await $fetch(`/api/items/${item.id}`, { method: 'PATCH', body: { pastedText: text } })
    pasteOpenId.value = null
    pasteText.value = ''
    await refresh()
  } catch {
    actionError.value = 'Could not save that text. Please try again.'
  } finally {
    pasteSaving.value = false
  }
}

async function save() {
  validationError.value = null
  errorMessage.value = null
  duplicate.value = null
  duplicateUrl.value = null

  const value = url.value.trim()
  if (!value) {
    validationError.value = 'Enter a URL to save.'
    return
  }

  saving.value = true
  try {
    await $fetch('/api/items', { method: 'POST', body: { url: value } })
    url.value = ''
    await refresh()
  } catch (error) {
    const fetchError = error as { statusCode?: number; data?: Record<string, unknown> }
    if (fetchError.statusCode === 409 && fetchError.data) {
      duplicate.value = fetchError.data as unknown as DuplicateInfo
      duplicateUrl.value = value
    } else if (fetchError.statusCode === 400) {
      validationError.value =
        (fetchError.data?.message as string | undefined) ?? 'Enter a valid http(s) URL.'
    } else {
      errorMessage.value = 'Could not save that URL. Please try again.'
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UContainer class="py-12">
    <UPageHeader title="Library" description="Everything you save shows up here." />

    <UPageCard class="mt-8">
      <form class="flex flex-col gap-3" novalidate @submit.prevent="save">
        <UFormField label="Save a URL" :error="validationError ?? undefined">
          <div class="flex gap-2">
            <UInput
              v-model="url"
              type="url"
              placeholder="https://example.com/article"
              icon="i-lucide-link"
              class="flex-1"
              :disabled="saving"
              autocomplete="off"
            />
            <UButton type="submit" icon="i-lucide-bookmark-plus" :loading="saving">Save</UButton>
          </div>
        </UFormField>

        <UAlert
          v-if="duplicate"
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          :title="`Already saved on ${formatDate(duplicate.savedAt)}`"
        >
          <template #description>
            <!-- The reader page doesn't exist yet: link to the original URL. -->
            <ULink :href="duplicateUrl ?? undefined" target="_blank" rel="noopener noreferrer">
              Open it
            </ULink>
          </template>
        </UAlert>

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="errorMessage"
        />
      </form>
    </UPageCard>

    <UPageCard v-if="loadStatus !== 'pending' && items.length === 0" class="mt-6">
      <div class="flex flex-col items-center gap-4 py-12 text-center">
        <UIcon name="i-lucide-library-big" class="size-12 text-muted" />
        <div class="space-y-1">
          <p class="font-medium">Your library is empty</p>
          <p class="text-sm text-muted">Paste a URL above to save your first article or post.</p>
        </div>
      </div>
    </UPageCard>

    <UAlert
      v-if="actionError"
      class="mt-6"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="actionError"
    />

    <ul v-else class="mt-6 divide-y divide-default rounded-lg border border-default">
      <li v-for="item in items" :key="item.id" class="flex items-start gap-3 p-4">
        <div class="min-w-0 flex-1">
          <ULink :href="item.url" target="_blank" rel="noopener noreferrer" class="font-medium">
            <span class="block truncate">{{ displayTitle(item) }}</span>
          </ULink>
          <p class="truncate text-sm text-muted">
            {{ item.type.replace('_', ' ') }} · {{ formatDate(item.createdAt) }}
          </p>
          <p
            v-if="item.extractionStatus === 'failed' && item.extractionError"
            class="text-sm text-error"
          >
            {{ item.extractionError }}
          </p>
          <template v-if="item.extractionStatus === 'failed'">
            <p v-if="item.hasPastedText" class="text-sm text-muted">Pasted text saved.</p>
            <div class="mt-2 flex gap-2">
              <UButton
                size="xs"
                variant="outline"
                icon="i-lucide-rotate-cw"
                data-testid="retry-item"
                :loading="retryingId === item.id"
                @click="retry(item)"
              >
                Retry
              </UButton>
              <UButton
                size="xs"
                variant="outline"
                icon="i-lucide-clipboard-paste"
                data-testid="paste-item"
                @click="openPaste(item)"
              >
                Paste content
              </UButton>
            </div>
            <form
              v-if="pasteOpenId === item.id"
              class="mt-2 flex flex-col gap-2"
              @submit.prevent="savePaste(item)"
            >
              <UTextarea
                v-model="pasteText"
                :rows="6"
                maxlength="200000"
                placeholder="Paste the article text here"
                class="w-full"
                aria-label="Pasted content"
              />
              <div class="flex gap-2">
                <UButton type="submit" size="xs" :loading="pasteSaving">Save text</UButton>
                <UButton size="xs" variant="ghost" @click="pasteOpenId = null">Cancel</UButton>
              </div>
            </form>
          </template>
        </div>
        <UBadge
          :color="statusMeta[item.extractionStatus].color"
          variant="subtle"
          :icon="statusMeta[item.extractionStatus].icon"
          :class="{ 'animate-pulse': item.extractionStatus === 'pending' }"
          :data-testid="`extraction-${item.extractionStatus}`"
        >
          {{ statusMeta[item.extractionStatus].label }}
        </UBadge>
      </li>
    </ul>
  </UContainer>
</template>
