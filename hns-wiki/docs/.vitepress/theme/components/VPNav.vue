<script setup lang="ts">
import { useData } from 'vitepress'
import { inBrowser } from 'vitepress'
import { computed, watchEffect } from 'vue'
import VPNavBarSearch from 'vitepress/dist/client/theme-default/components/VPNavBarSearch.vue'

const { frontmatter } = useData()

const hasNavbar = computed(() => {
  return frontmatter.value.navbar !== false
})

watchEffect(() => {
  if (inBrowser) {
    document.documentElement.classList.toggle('hide-nav', !hasNavbar.value)
  }
})
</script>

<template>
  <div v-if="hasNavbar" class="vp-nav-spacer" />

  <header v-if="hasNavbar" class="VPNav hns-wiki-nav">
    <div class="hns-wiki-nav__inner">
      <a class="hns-wiki-nav__brand" href="https://h4cknstack.com" aria-label="H4ck&Stack home">
        <img
          src="https://h4cknstack.com/branding/hns-name.svg"
          alt="H4ck&Stack"
          class="hns-wiki-nav__logo"
        >
      </a>

      <div class="hns-wiki-nav__search">
        <VPNavBarSearch />
      </div>

      <nav class="hns-wiki-nav__links" aria-label="External links">
        <a class="hns-wiki-nav__icon" href="https://h4cknstack.com" aria-label="Website">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm6.9 8h-3.1a13.6 13.6 0 0 0-1.1-5 7.05 7.05 0 0 1 4.2 5ZM12 5c.8 1.1 1.5 3.1 1.7 6h-3.4c.2-2.9.9-4.9 1.7-6Zm-2.7 1A13.6 13.6 0 0 0 8.2 11H5.1a7.05 7.05 0 0 1 4.2-5ZM5.1 13h3.1c.2 1.9.6 3.6 1.1 5a7.05 7.05 0 0 1-4.2-5Zm6.9 6c-.8-1.1-1.5-3.1-1.7-6h3.4c-.2 2.9-.9 4.9-1.7 6Zm2.7-1c.5-1.4.9-3.1 1.1-5h3.1a7.05 7.05 0 0 1-4.2 5Z" />
          </svg>
        </a>
        <a class="hns-wiki-nav__icon" href="https://github.com/edonamulaj0/hns-bot" aria-label="GitHub">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.2.8-.6v-2.1c-3.3.7-4-1.4-4-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 .1.8 2.1 3.4 1.5.1-.8.4-1.3.8-1.6-2.6-.3-5.4-1.3-5.4-5.8 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.5-2.8 5.5-5.4 5.8.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6A12 12 0 0 0 12 .5Z" />
          </svg>
        </a>
        <a class="hns-wiki-nav__icon" href="https://discord.gg/xrxTUsgdv9" aria-label="Discord">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.3 4.4A18.8 18.8 0 0 0 15.6 3l-.2.4c1.7.4 2.5 1 2.5 1a15 15 0 0 0-11.8 0s.8-.6 2.6-1L8.4 3a18.8 18.8 0 0 0-4.7 1.4C.7 8.8-.1 13.1.3 17.3A19 19 0 0 0 6 20.1l.7-.9c-1.3-.5-2.5-1.2-3.5-2.2.3.2.6.4.9.6a15.3 15.3 0 0 0 15.8 0l.9-.6a9 9 0 0 1-3.5 2.2l.7.9a19 19 0 0 0 5.7-2.8c.5-4.9-.8-9.1-3.4-12.9ZM8 14.7c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Zm8 0c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Z" />
          </svg>
        </a>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.VPNav {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  width: 100%;
  pointer-events: auto;
}

.vp-nav-spacer {
  height: var(--vp-nav-height);
}

.hns-wiki-nav {
  height: var(--vp-nav-height);
  border-bottom: 1px solid var(--border);
  background: var(--bg-overlay);
  backdrop-filter: blur(12px);
}

.hns-wiki-nav__inner {
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(120px, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: var(--container-max);
  height: 100%;
  margin: 0 auto;
  padding: 0 clamp(1rem, 4vw, 2.5rem);
}

.hns-wiki-nav__brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  text-decoration: none;
}

.hns-wiki-nav__logo {
  display: block;
  width: auto;
  height: 32px;
  max-width: min(220px, 42vw);
  object-fit: contain;
}

.hns-wiki-nav__search {
  display: flex;
  min-width: 0;
  justify-content: flex-end;
}

.hns-wiki-nav__links {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.hns-wiki-nav__icon {
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--text-dim);
  text-decoration: none;
  transition: border-color 200ms ease, color 200ms ease, background 200ms ease;
}

.hns-wiki-nav__icon:hover {
  border-color: var(--accent-border-soft);
  background: var(--accent-soft);
  color: var(--accent);
}

.hns-wiki-nav__icon svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}
</style>

<style>
@media (max-width: 640px) {
  .hns-wiki-nav__inner {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "brand links"
      "search search";
    height: auto;
    min-height: var(--vp-nav-height);
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .hns-wiki-nav {
    height: auto;
  }

  .vp-nav-spacer {
    height: 106px;
  }

  .hns-wiki-nav__brand {
    grid-area: brand;
  }

  .hns-wiki-nav__search {
    grid-area: search;
    justify-content: stretch;
  }

  .hns-wiki-nav__links {
    grid-area: links;
  }

  .hns-wiki-nav__logo {
    height: 28px;
    max-width: min(190px, 56vw);
  }
}
</style>
