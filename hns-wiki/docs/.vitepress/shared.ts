/**
 *  Copyright (c) 2025 taskylizard. Apache License 2.0.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import type { DefaultTheme } from 'vitepress'

// @unocss-include

export const meta = {
    name: 'H4ck&Stack Wiki',
    hostname: 'https://wiki.h4cknstack.com',
    description:
        'Free resources for developers, builders, and security researchers — curated by the H4ck&Stack community.',
    keywords: [
        'H4ck&Stack',
        'wiki',
        'developers',
        'security',
        'resources',
        'builders',
        'open source'
    ],
    tags: {
        title: 'H4ck&Stack Wiki',
        description: 'Free resources for developers, builders, and security researchers.',
        image: 'https://h4cknstack.com/branding/hns-name.svg',
        url: 'https://wiki.h4cknstack.com'
    },
    build: {
        /** Opt in with `FMHY_BUILD_API=true` (e.g. local FMHY parity). */
        api: false
    }
}

export const excluded = [
    'readme.md',
    'single-page',
    'feedback.md',
    'index.md',
    'sandbox.md',
    'startpage.md'
]

const safeEnv = (key: string) => typeof process !== 'undefined' ? process.env?.[key] : undefined

if (safeEnv('FMHY_BUILD_API') === 'true') {
    meta.build.api = true
}

/** Monorepo root — wiki lives in hns-wiki/docs */
const HNS_BOT_REPO = 'h4cknstack/hns-bot'

const formatCommitRef = (commitRef: string) =>
    `<a href="https://github.com/${HNS_BOT_REPO}/commit/${commitRef}">${commitRef.slice(0, 8)}</a>`

const cfStart = safeEnv('CF_PAGES_COMMIT_SHA')
const commitStart = safeEnv('COMMIT_REF')

export const commitRef =
    safeEnv('CF_PAGES') && cfStart
        ? formatCommitRef(cfStart)
        : commitStart
            ? formatCommitRef(commitStart)
            : 'dev'

export const feedback = `<span class="feedback-footer">H4ck&Stack Wiki</span>`

export const socialLinks: DefaultTheme.SocialLink[] = [
    { icon: 'github', link: `https://github.com/${HNS_BOT_REPO}` },
    { icon: 'discord', link: 'https://discord.gg/xrxTUsgdv9' }
]

export const nav: DefaultTheme.NavItem[] = [
    { text: '← H4ck&Stack', link: 'https://h4cknstack.com' },
    { text: '📖 Beginners Guide', link: '/beginners-guide' },
    { text: '🌐 Search', link: '/posts/search' },
    {
        text: '💡 Contribute',
        link: `https://github.com/${HNS_BOT_REPO}/issues`
    }
]

export const sidebar: DefaultTheme.Sidebar | DefaultTheme.NavItemWithLink[] = [
    {
        text: '<span class="i-twemoji:books"></span> Beginners Guide',
        link: '/beginners-guide'
    },
    {
        text: '<span class="i-twemoji:newspaper"></span> Posts',
        link: '/posts'
    },
    {
        text: '<span class="i-twemoji:light-bulb"></span> Contribute',
        link: `https://github.com/${HNS_BOT_REPO}/issues`
    },
    {
        text: 'Wiki',
        collapsed: false,
        items: [
            {
                text: '<span class="i-twemoji:name-badge"></span> Adblocking / Privacy',
                link: '/privacy'
            },
            {
                text: '<span class="i-twemoji:robot"></span> Artificial Intelligence',
                link: '/ai'
            },
            {
                text: '<span class="i-twemoji:brain"></span> Educational',
                link: '/educational'
            },
            {
                text: '<span class="i-twemoji:mobile-phone"></span> Android / iOS',
                link: '/mobile'
            },
            {
                text: '<span class="i-twemoji:penguin"></span> Linux / macOS',
                link: '/linux-macos'
            }
        ]
    },
    {
        text: 'Tools',
        collapsed: false,
        items: [
            {
                text: '<span class="i-twemoji:laptop"></span> System Tools',
                link: '/system-tools'
            },
            {
                text: '<span class="i-twemoji:card-file-box"></span> File Tools',
                link: '/file-tools'
            },
            {
                text: '<span class="i-twemoji:paperclip"></span> Internet Tools',
                link: '/internet-tools'
            },
            {
                text: '<span class="i-twemoji:left-speech-bubble"></span> Social Media Tools',
                link: '/social-media-tools'
            },
            {
                text: '<span class="i-twemoji:memo"></span> Text Tools',
                link: '/text-tools'
            },
            {
                text: '<span class="i-twemoji:red-apple"></span> Educational Tools',
                link: '/educational#educational-tools'
            },
            {
                text: '<span class="i-twemoji:man-technologist"></span> Developer Tools',
                link: '/developer-tools'
            }
        ]
    },
    {
        text: 'Other',
        collapsed: true,
        items: [
            {
                text: '<span class="i-twemoji:television"></span> Movies / TV / Anime',
                link: '/video'
            },
            {
                text: '<span class="i-twemoji:musical-note"></span> Music / Podcasts / Radio',
                link: '/audio'
            },
            {
                text: '<span class="i-twemoji:video-game"></span> Gaming / Emulation',
                link: '/gaming'
            },
            {
                text: '<span class="i-twemoji:green-book"></span> Books / Comics / Manga',
                link: '/reading'
            },
            {
                text: '<span class="i-twemoji:floppy-disk"></span> Downloading',
                link: '/downloading'
            },
            {
                text: '<span class="i-twemoji:cyclone"></span> Torrenting',
                link: '/torrenting'
            },
            {
                text: '<span class="i-twemoji:file-folder"></span> Miscellaneous',
                link: '/misc'
            },
            {
                text: '<span class="i-twemoji:alien-monster"></span> Gaming Tools',
                link: '/gaming-tools'
            },
            {
                text: '<span class="i-twemoji:camera"></span> Image Tools',
                link: '/image-tools'
            },
            {
                text: '<span class="i-twemoji:videocassette"></span> Video Tools',
                link: '/video-tools'
            },
            {
                text: '<span class="i-twemoji:speaker-high-volume"></span> Audio Tools',
                link: '/audio#audio-tools'
            },
            {
                text: '<span class="i-twemoji:package"></span> Storage',
                link: '/storage'
            }
        ]
    }
]
