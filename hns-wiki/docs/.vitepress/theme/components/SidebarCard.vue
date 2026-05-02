<script setup lang="ts">
import Field from './CardField.vue'
import InputField from './InputField.vue'
import ToggleStarred from './ToggleStarred.vue'
import ToggleIndexes from './ToggleIndexes.vue'
</script>

<template>
  <div
    class="relative z-0 rounded border border-solid border-$vp-c-divider bg-$vp-c-bg-soft p-5 transition-colors duration-200 hover:border-primary"
  >
    <div class="align-center mb-4 flex justify-between">
      <div class="text-$vp-c-text-1 lh-relaxed text-sm font-bold">
        Emoji Legend
      </div>
    </div>
    <Field icon="i-twemoji-globe-with-meridians">Indexes</Field>
    <Field icon="i-twemoji-repeat-button">Storage Links</Field>
    <Field icon="i-twemoji-star">Recommendations</Field>
    <div class="align-center mb-4 mt-4 flex justify-between">
      <div class="text-$vp-c-text-1 lh-relaxed text-sm font-bold">Options</div>
    </div>
    <InputField id="toggle-starred" label="Toggle Starred">
      <template #display>
        <ToggleStarred switch-id="toggle-starred" />
      </template>
    </InputField>
    <InputField id="toggle-indexes" label="Toggle Indexes">
      <template #display>
        <ToggleIndexes switch-id="toggle-indexes" />
      </template>
    </InputField>
  </div>
</template>