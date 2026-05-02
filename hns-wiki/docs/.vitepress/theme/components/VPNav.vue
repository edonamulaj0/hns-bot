<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { useData } from 'vitepress'
import { inBrowser } from 'vitepress'
import VPNavBarSearch from 'vitepress/dist/client/theme-default/components/VPNavBarSearch.vue'

const WIKI_ORIGIN = 'https://wiki.h4cknstack.com'
const MAIN_SITE = 'https://h4cknstack.com'
const GITHUB_REPO = 'https://github.com/edonamulaj0/hns-bot'
const DISCORD_INVITE = 'https://discord.gg/xrxTUsgdv9'

const { frontmatter } = useData()

const hasNavbar = computed(() => frontmatter.value.navbar !== false)

const menuOpen = ref(false)

let removeMqListener: (() => void) | undefined

function closeMenu() {
  menuOpen.value = false
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenu()
}

watchEffect(() => {
  if (inBrowser) {
    document.documentElement.classList.toggle('hide-nav', !hasNavbar.value)
  }
})

watch(menuOpen, (open) => {
  if (!inBrowser) return
  document.documentElement.classList.toggle('hns-wiki-nav-lock', open)
  if (open) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})

onMounted(() => {
  if (!inBrowser) return
  const mq = window.matchMedia('(min-width: 768px)')
  const closeIfDesktop = () => {
    if (mq.matches) closeMenu()
  }
  mq.addEventListener('change', closeIfDesktop)
  removeMqListener = () => mq.removeEventListener('change', closeIfDesktop)
})

onUnmounted(() => {
  removeMqListener?.()
  if (inBrowser) {
    document.documentElement.classList.remove('hns-wiki-nav-lock', 'hide-nav')
    window.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <div v-if="hasNavbar" class="vp-nav-spacer" />

  <header v-if="hasNavbar" class="VPNav hns-wiki-nav">
    <div class="hns-wiki-nav__inner">
      <a class="hns-wiki-nav__brand" :href="`${WIKI_ORIGIN}/`" aria-label="Wiki home">
        <img
          src="https://h4cknstack.com/branding/hns-name.svg"
          alt="H4ck&Stack"
          class="hns-wiki-nav__logo"
          width="280"
          height="52"
        >
      </a>

      <div class="hns-wiki-nav__search hns-wiki-nav__search--desktop">
        <VPNavBarSearch />
      </div>

      <nav class="hns-wiki-nav__links hns-wiki-nav__links--desktop" aria-label="External links">
        <a class="hns-wiki-nav__icon" :href="MAIN_SITE" aria-label="Website">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm6.9 8h-3.1a13.6 13.6 0 0 0-1.1-5 7.05 7.05 0 0 1 4.2 5ZM12 5c.8 1.1 1.5 3.1 1.7 6h-3.4c.2-2.9.9-4.9 1.7-6Zm-2.7 1A13.6 13.6 0 0 0 8.2 11H5.1a7.05 7.05 0 0 1 4.2-5ZM5.1 13h3.1c.2 1.9.6 3.6 1.1 5a7.05 7.05 0 0 1-4.2-5Zm6.9 6c-.8-1.1-1.5-3.1-1.7-6h3.4c-.2 2.9-.9 4.9-1.7 6Zm2.7-1c.5-1.4.9-3.1 1.1-5h3.1a7.05 7.05 0 0 1-4.2 5Z" />
          </svg>
        </a>
        <a class="hns-wiki-nav__icon" :href="GITHUB_REPO" aria-label="GitHub">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.2.8-.6v-2.1c-3.3.7-4-1.4-4-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 .1.8 2.1 3.4 1.5.1-.8.4-1.3.8-1.6-2.6-.3-5.4-1.3-5.4-5.8 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.5-2.8 5.5-5.4 5.8.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6A12 12 0 0 0 12 .5Z" />
          </svg>
        </a>
        <a class="hns-wiki-nav__icon" :href="DISCORD_INVITE" aria-label="Discord">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.3 4.4A18.8 18.8 0 0 0 15.6 3l-.2.4c1.7.4 2.5 1 2.5 1a15 15 0 0 0-11.8 0s.8-.6 2.6-1L8.4 3a18.8 18.8 0 0 0-4.7 1.4C.7 8.8-.1 13.1.3 17.3A19 19 0 0 0 6 20.1l.7-.9c-1.3-.5-2.5-1.2-3.5-2.2.3.2.6.4.9.6a15.3 15.3 0 0 0 15.8 0l.9-.6a9 9 0 0 1-3.5 2.2l.7.9a19 19 0 0 0 5.7-2.8c.5-4.9-.8-9.1-3.4-12.9ZM8 14.7c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Zm8 0c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Z" />
          </svg>
        </a>
      </nav>

      <button
        type="button"
        class="hns-wiki-nav__burger"
        aria-label="Open menu"
        :aria-expanded="menuOpen"
        @click="toggleMenu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
    </div>
  </header>

  <Teleport v-if="menuOpen" to="body">
    <div
      class="hns-wiki-mobile-nav"
      role="dialog"
      aria-modal="true"
      aria-label="Wiki navigation menu"
    >
      <div class="hns-wiki-mobile-nav__backdrop" @click="closeMenu" />
      <div class="hns-wiki-mobile-nav__panel">
        <div class="hns-wiki-mobile-nav__top">
          <span class="hns-wiki-mobile-nav__title">Menu</span>
          <button type="button" class="hns-wiki-mobile-nav__close" aria-label="Close menu" @click="closeMenu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="hns-wiki-mobile-nav__body">
          <div class="hns-wiki-mobile-nav__search">
            <VPNavBarSearch />
          </div>

          <a class="hns-wiki-mobile-nav__link" :href="`${WIKI_ORIGIN}/`" @click="closeMenu">
            Wiki home
          </a>

          <a class="hns-wiki-mobile-nav__link" :href="GITHUB_REPO" @click="closeMenu">
            GitHub
          </a>

          <a class="hns-wiki-mobile-nav__link" :href="DISCORD_INVITE" @click="closeMenu">
            Discord
          </a>

          <a class="hns-wiki-mobile-nav__cta" :href="MAIN_SITE" @click="closeMenu">
            Visit H4ck&amp;Stack
          </a>
        </div>
      </div>
    </div>
  </Teleport>
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
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem 1rem;
  width: 100%;
  max-width: var(--container-max);
  height: 100%;
  margin: 0 auto;
  padding: 0 clamp(1.5rem, 4vw, 2.5rem);
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
  height: 42px;
  max-width: min(280px, 62vw);
  object-fit: contain;
}

.hns-wiki-nav__search--desktop {
  display: none;
  min-width: 0;
  justify-content: center;
  justify-self: center;
  width: 100%;
  max-width: 260px;
}

.hns-wiki-nav__links--desktop {
  display: none;
  align-items: center;
  gap: 0.25rem;
}

.hns-wiki-nav__burger {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-bright);
  border-radius: 4px;
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
  transition: border-color 200ms ease, color 200ms ease, background 200ms ease;
}

.hns-wiki-nav__burger:hover {
  border-color: var(--accent-border-soft);
  background: var(--accent-soft);
  color: var(--accent);
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

@media (min-width: 768px) {
  .hns-wiki-nav__burger {
    display: none;
  }

  .hns-wiki-nav__search--desktop {
    display: flex;
  }

  .hns-wiki-nav__links--desktop {
    display: inline-flex;
  }

  .hns-wiki-nav__inner {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .hns-wiki-nav__logo {
    height: 46px;
    max-width: min(300px, 36vw);
  }
}
</style>

<style>
html.hns-wiki-nav-lock {
  overflow: hidden;
}

.hns-wiki-mobile-nav {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
}

.hns-wiki-mobile-nav__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(5, 5, 5, 0.65);
}

.hns-wiki-mobile-nav__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100dvh;
  background: var(--bg);
  border-right: 1px solid var(--border);
}

.hns-wiki-mobile-nav__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 0.75rem clamp(1.25rem, 4vw, 2rem);
  border-bottom: 1px solid var(--border);
}

.hns-wiki-mobile-nav__title {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dimmer);
}

.hns-wiki-mobile-nav__close {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-bright);
  border-radius: 4px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.hns-wiki-mobile-nav__close:hover {
  border-color: var(--accent-border-soft);
  color: var(--accent);
}

.hns-wiki-mobile-nav__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  gap: 1rem;
  padding: clamp(1rem, 4vh, 2rem) clamp(1.5rem, 5vw, 2.5rem) clamp(2rem, 6vh, 3rem);
  text-align: center;
}

.hns-wiki-mobile-nav__search {
  width: 100%;
  max-width: 320px;
}

.hns-wiki-mobile-nav__body .hns-wiki-mobile-nav__search :deep(.DocSearch-Button) {
  width: 100%;
  min-height: 42px;
}

.hns-wiki-mobile-nav__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem 1.25rem;
  border: 1px solid var(--border-bright);
  border-radius: 4px;
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--text-dim);
  text-decoration: none;
  width: min(320px, 100%);
  transition: border-color 200ms ease, color 200ms ease, background 200ms ease;
}

.hns-wiki-mobile-nav__link:hover {
  border-color: var(--accent-border-soft);
  background: var(--accent-soft);
  color: var(--accent);
}

.hns-wiki-mobile-nav__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 1.5rem;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: var(--accent);
  color: var(--button-primary-text);
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: var(--text-sm);
  text-decoration: none;
  width: min(320px, 100%);
  transition: background 200ms ease, border-color 200ms ease;
}

.hns-wiki-mobile-nav__cta:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}

@media (min-width: 768px) {
  .hns-wiki-mobile-nav {
    display: none !important;
  }
}
</style>
