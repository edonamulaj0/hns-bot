<script setup lang="ts">
import { ref, useId } from 'vue'

const props = defineProps<{
  show: boolean
  url: string
}>()

const emit = defineEmits(['close'])
const dontShowAgain = ref(false)
const dontShowId = useId()

const close = () => {
  emit('close')
}

const openLink = () => {
  if (dontShowAgain.value) {
    localStorage.setItem('fmhy-base64-dialog-preference', 'true')
  }
  window.open(props.url, '_blank')
  close()
}
</script>

<template>
  <Teleport to="body">
    <div v-show="show" class="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click="close">
      <div
        class="w-full max-w-md rounded border border-div bg-bg-alt p-6"
        @click.stop
      >
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <div class="i-carbon:information-filled text-primary" />
          Base64 Encoded Link
        </h2>
        <p class="mb-4 text-text-1">
          The link you clicked leads to a Base64 encoded string.
        </p>
        <p class="mb-2 text-text-1">
          To decode it, you can use:
        </p>
        <ul class="list-disc list-inside mb-4 space-y-2 text-text-1">
          <li>
            An online tool: <a href="https://www.base64decode.org/" target="_blank" rel="noreferrer" class="text-primary hover:underline font-medium">Base64 Decode</a>
          </li>
          <li>
            A userscript: <a href="https://greasyfork.org/en/scripts/485772-fmhy-base64-auto-decoder" target="_blank" rel="noreferrer" class="text-primary hover:underline font-medium">FMHY Base64 Auto Decoder</a> (using a <a href="/internet-tools#userscripts" target="_blank" class="text-primary hover:underline font-medium">userscript manager</a>)
          </li>
        </ul>
        
        <p class="mb-6 text-sm text-text-2">
          For more options: <a href="/text-tools#encode-decode" target="_blank" class="text-primary hover:underline font-medium">Base64 Decoders</a>
        </p>
        
        <div class="flex items-center gap-2 mb-4">
          <input
            :id="dontShowId"
            v-model="dontShowAgain"
            type="checkbox"
            class="rounded border border-div bg-bg-alt text-primary focus:ring-primary"
          >
          <label :for="dontShowId" class="text-sm text-text-1 select-none">Don't show again</label>
        </div>

        <div class="flex justify-end gap-3">
          <button
            @click="close"
            class="rounded border border-div px-4 py-2 font-mono text-sm font-medium text-text-2 transition-colors hover:border-primary hover:text-primary"
          >
            Cancel
          </button>
          <button
            @click="openLink"
            class="rounded border border-primary bg-primary px-4 py-2 font-mono text-sm font-bold text-black transition-colors hover:bg-[var(--vp-button-brand-hover-bg)] hover:border-[var(--vp-button-brand-hover-border)]"
          >
            Open Link
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
