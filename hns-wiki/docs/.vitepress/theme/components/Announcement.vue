<script setup lang="ts">
const { frontmatter } = useData()
</script>

<template>
  <a
    v-if="frontmatter.hero.announcement"
    :href="frontmatter.hero.announcement.link"
    class="mb-3 inline-flex items-center rounded border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1 font-mono text-xs font-semibold text-[var(--text-dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
  >
    {{ frontmatter.hero.announcement.title }}
  </a>
</template>
