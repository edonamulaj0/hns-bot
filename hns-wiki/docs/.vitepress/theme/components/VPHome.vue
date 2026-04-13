<script setup lang="ts">
/**
 * VitePress default renders <Content /> after the features grid on the home layout.
 * We reorder so markdown in index.md (e.g. link-decoder tip) sits below the hero and
 * above features + #home-features-before.
 */
import VPHomeHero from 'vitepress/dist/client/theme-default/components/VPHomeHero.vue'
import VPHomeContent from 'vitepress/dist/client/theme-default/components/VPHomeContent.vue'
import VPHomeFeatures from 'vitepress/dist/client/theme-default/components/VPHomeFeatures.vue'
import { useData } from 'vitepress/dist/client/theme-default/composables/data'

const { frontmatter, theme } = useData()
</script>

<template>
  <div
    class="VPHome VPHome--hns"
    :class="{
      'external-link-icon-enabled': theme.externalLinkIcon
    }"
  >
    <slot name="home-hero-before" />
    <VPHomeHero>
      <template #home-hero-info-before>
        <slot name="home-hero-info-before" />
      </template>
      <template #home-hero-info>
        <slot name="home-hero-info" />
      </template>
      <template #home-hero-info-after>
        <slot name="home-hero-info-after" />
      </template>
      <template #home-hero-actions-after>
        <slot name="home-hero-actions-after" />
      </template>
      <template #home-hero-image>
        <slot name="home-hero-image" />
      </template>
    </VPHomeHero>
    <slot name="home-hero-after" />

    <VPHomeContent v-if="frontmatter.markdownStyles !== false">
      <Content />
    </VPHomeContent>
    <Content v-else />

    <slot name="home-features-before" />
    <VPHomeFeatures />
    <slot name="home-features-after" />
  </div>
</template>

<style scoped>
.VPHome--hns {
  margin-bottom: 96px;
}

@media (min-width: 768px) {
  .VPHome--hns {
    margin-bottom: 128px;
  }
}
</style>
