<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
  watchEffect,
} from 'vue'
import { useData } from 'vitepress'
import { inBrowser } from 'vitepress'
import { onKeyStroke } from '@vueuse/core'
import VPNavBarSearchButton from 'vitepress/dist/client/theme-default/components/VPNavBarSearchButton.vue'

const VPLocalSearchBox = defineAsyncComponent(() =>
  import('vitepress/dist/client/theme-default/components/VPLocalSearchBox.vue'),
)

const LOCAL_SEARCH_FILTER_KEY = 'vitepress:local-search-filter'

const WIKI_ORIGIN = 'https://wiki.h4cknstack.com'
const MAIN_SITE = 'https://h4cknstack.com'
const GITHUB_REPO = 'https://github.com/edonamulaj0/hns-bot'
const DISCORD_INVITE = 'https://discord.gg/xrxTUsgdv9'

const { frontmatter } = useData()

const hasNavbar = computed(() => frontmatter.value.navbar !== false)

const menuOpen = ref(false)
const searchOpen = ref(false)
const mobileSearchExpanded = ref(false)
const mobileSearchInputRef = ref<HTMLInputElement | null>(null)
const mobileSearchQuery = ref('')

let removeMqListener: (() => void) | undefined

function closeMenu() {
  menuOpen.value = false
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
  if (menuOpen.value) mobileSearchExpanded.value = false
}

function openSearchModal() {
  searchOpen.value = true
  mobileSearchExpanded.value = false
}

function onSearchClose() {
  searchOpen.value = false
}

function toggleMobileSearchBar() {
  menuOpen.value = false
  mobileSearchExpanded.value = !mobileSearchExpanded.value
  if (mobileSearchExpanded.value) {
    try {
      mobileSearchQuery.value = sessionStorage.getItem(LOCAL_SEARCH_FILTER_KEY) ?? ''
    } catch {
      mobileSearchQuery.value = ''
    }
    nextTick(() => {
      mobileSearchInputRef.value?.focus()
      mobileSearchInputRef.value?.select()
    })
  }
}

function persistMobileQuery() {
  try {
    sessionStorage.setItem(LOCAL_SEARCH_FILTER_KEY, mobileSearchQuery.value)
  } catch {
    /* ignore */
  }
}

function submitMobileInlineSearch() {
  persistMobileQuery()
  openSearchModal()
}

function isEditingContent(event: KeyboardEvent): boolean {
  const element = event.target as HTMLElement
  const tagName = element.tagName
  return (
    element.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'SELECT' ||
    tagName === 'TEXTAREA'
  )
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

watch(searchOpen, (open) => {
  if (open) mobileSearchExpanded.value = false
})

watchEffect((onCleanup) => {
  if (!inBrowser || !mobileSearchExpanded.value) return
  const onEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') mobileSearchExpanded.value = false
  }
  window.addEventListener('keydown', onEsc)
  onCleanup(() => window.removeEventListener('keydown', onEsc))
})

let stopSearchHotkeys: (() => void) | undefined

onMounted(() => {
  if (!inBrowser) return

  const stopK = onKeyStroke(
    'k',
    (event) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      openSearchModal()
    },
    { target: document },
  )
  const stopSlash = onKeyStroke(
    '/',
    (event) => {
      if (isEditingContent(event)) return
      event.preventDefault()
      openSearchModal()
    },
    { target: document },
  )
  stopSearchHotkeys = () => {
    stopK()
    stopSlash()
  }

  const mq = window.matchMedia('(min-width: 768px)')
  const closeIfDesktop = () => {
    if (!mq.matches) return
    closeMenu()
    mobileSearchExpanded.value = false
  }
  mq.addEventListener('change', closeIfDesktop)
  removeMqListener = () => mq.removeEventListener('change', closeIfDesktop)
})

onUnmounted(() => {
  removeMqListener?.()
  stopSearchHotkeys?.()
  if (inBrowser) {
    document.documentElement.classList.remove('hns-wiki-nav-lock', 'hide-nav')
    window.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <div v-if="hasNavbar" class="vp-nav-spacer" />

  <VPLocalSearchBox v-if="searchOpen" @close="onSearchClose" />

  <header v-if="hasNavbar" class="VPNav hns-wiki-nav">
    <div class="hns-wiki-nav__top">
      <div class="hns-wiki-nav__inner">
        <a class="hns-wiki-nav__brand" :href="`${WIKI_ORIGIN}/`" aria-label="H4ck&amp;Stack Wiki home">
          <span class="hns-wiki-nav__wordmark" aria-hidden="true">
            <span class="hns-wiki-nav__wordmark-purple">H4ck</span><span class="hns-wiki-nav__wordmark-lime">&amp;Stack&nbsp;</span><span class="hns-wiki-nav__wordmark-lime">Wiki</span>
          </span>
        </a>

        <div class="hns-wiki-nav__search hns-wiki-nav__search--desktop">
          <div id="local-search">
            <VPNavBarSearchButton @click="openSearchModal" />
          </div>
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

        <div class="hns-wiki-nav__mobile-actions">
          <button
            type="button"
            class="hns-wiki-nav__icon-btn"
            aria-label="Search wiki"
            :aria-expanded="mobileSearchExpanded"
            @click="toggleMobileSearchBar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.35-4.35" stroke-linecap="round" />
            </svg>
          </button>
          <button
            type="button"
            class="hns-wiki-nav__icon-btn"
            aria-label="Open menu"
            :aria-expanded="menuOpen"
            @click="toggleMenu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      <div
        v-if="mobileSearchExpanded"
        class="hns-wiki-nav__mobile-search-row"
      >
        <input
          ref="mobileSearchInputRef"
          v-model="mobileSearchQuery"
          type="search"
          class="hns-wiki-nav__mobile-search-input"
          aria-label="Search wiki"
          placeholder="Search wiki…"
          autocomplete="off"
          enterkeyhint="search"
          @input="persistMobileQuery"
          @keydown.enter.prevent="submitMobileInlineSearch"
        />
      </div>
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
  overflow: visible;
  border-bottom: 1px solid var(--border);
  background: var(--bg-overlay);
  backdrop-filter: blur(12px);
}

.hns-wiki-nav__top {
  position: relative;
  z-index: 1001;
  width: 100%;
}

.hns-wiki-nav__inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem 1rem;
  width: 100%;
  max-width: var(--container-max);
  height: 100%;
  min-height: var(--vp-nav-height);
  margin: 0 auto;
  padding: 0 clamp(1.5rem, 4vw, 2.5rem);
}

.hns-wiki-nav__brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  text-decoration: none;
}

.hns-wiki-nav__wordmark {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  font-family: var(--vp-font-family-mono), ui-monospace, monospace;
  font-size: clamp(1rem, 3.6vw, 1.2rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.hns-wiki-nav__wordmark-purple {
  color: var(--accent-subtle, #7c2feb);
}

.hns-wiki-nav__wordmark-lime {
  color: var(--accent, #ccff00);
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

.hns-wiki-nav__mobile-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  justify-self: end;
}

.hns-wiki-nav__icon-btn {
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

.hns-wiki-nav__icon-btn:hover {
  border-color: var(--accent-border-soft);
  background: var(--accent-soft);
  color: var(--accent);
}

.hns-wiki-nav__mobile-search-row {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1002;
  padding: 0.5rem clamp(1.5rem, 4vw, 2.5rem) 0.65rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-overlay);
  backdrop-filter: blur(12px);
}

.hns-wiki-nav__mobile-search-input {
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;
  padding: 0.55rem 0.85rem;
  border: 1px solid var(--border-bright);
  border-radius: 4px;
  background: var(--bg-card);
  color: var(--text);
  font-family: var(--vp-font-family-mono), ui-monospace, monospace;
  font-size: 0.875rem;
}

.hns-wiki-nav__mobile-search-input::placeholder {
  color: var(--text-dimmer);
}

.hns-wiki-nav__mobile-search-input:focus {
  border-color: var(--accent-border-soft);
  outline: none;
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
  .hns-wiki-nav__mobile-actions {
    display: none;
  }

  .hns-wiki-nav__mobile-search-row {
    display: none !important;
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

  .hns-wiki-nav__wordmark {
    font-size: 1.25rem;
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
