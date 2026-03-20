<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { useWindowSize } from '@vueuse/core'
import type { Component } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NLayout, NLayoutSider, NLayoutContent, NLayoutHeader,
  NMenu, NButton, NSpace, NText, NIcon
} from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import { useTheme } from '../composables/useTheme'
import { 
  SpeedometerOutline, 
  PeopleOutline, 
  TerminalOutline, 
  MegaphoneOutline, 
  HardwareChipOutline,
  SunnyOutline,
  MoonOutline
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { isDark, toggleTheme } = useTheme()
const collapsed = ref(false)

function renderIcon (icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const navItems = [
  { label: '仪表盘', key: 'dashboard', icon: SpeedometerOutline },
  { label: '玩家', key: 'players', icon: PeopleOutline },
  { label: '控制台', key: 'console', icon: TerminalOutline },
  { label: '公告', key: 'announcements', icon: MegaphoneOutline },
  { label: '插件', key: 'plugins', icon: HardwareChipOutline },
]

const menuOptions: MenuOption[] = [
  { label: '仪表盘', key: 'dashboard', icon: renderIcon(SpeedometerOutline) },
  { label: '玩家管理', key: 'players', icon: renderIcon(PeopleOutline) },
  { label: '控制台', key: 'console', icon: renderIcon(TerminalOutline) },
  { label: '公告管理', key: 'announcements', icon: renderIcon(MegaphoneOutline) },
  { label: '插件管理', key: 'plugins', icon: renderIcon(HardwareChipOutline) },
]

const activeKey = computed(() => route.name as string)

const { width } = useWindowSize()
const isMobile = computed(() => width.value <= 1024)

function handleMenuUpdate(key: string) {
  router.push({ name: key })
}

function handleThemeToggle(event: MouseEvent) {
  const x = event.clientX
  const y = event.clientY
  const endRadius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y)
  )

  const isDarkCurrent = isDark.value
  const targetBg = isDarkCurrent ? '#f3f4f6' : '#101014'

  if (!document.startViewTransition) {
    // Fallback: manual overlay for Firefox and older browsers
    const overlay = document.createElement('div')
    overlay.style.position = 'fixed'
    overlay.style.top = '0'
    overlay.style.left = '0'
    overlay.style.width = '100vw'
    overlay.style.height = '100vh'
    overlay.style.backgroundColor = targetBg
    overlay.style.zIndex = '9999'
    overlay.style.pointerEvents = 'none'
    overlay.style.clipPath = `circle(0px at ${x}px ${y}px)`
    overlay.style.transition = 'clip-path 400ms ease-in'
    document.body.appendChild(overlay)

    // Trigger reflow
    overlay.offsetHeight

    overlay.style.clipPath = `circle(${endRadius}px at ${x}px ${y}px)`

    setTimeout(() => {
      toggleTheme()
      setTimeout(() => {
        document.body.removeChild(overlay)
      }, 50)
    }, 400)
    return
  }

  const transition = document.startViewTransition(() => {
    toggleTheme()
  })

  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`
        ]
      },
      {
        duration: 400,
        easing: 'ease-in',
        pseudoElement: '::view-transition-new(root)'
      }
    )
  })
}
</script>

<template>
  <NLayout :has-sider="!isMobile" class="app-layout" style="height: 100vh">
    <!-- Desktop Sidebar -->
    <NLayoutSider
      v-if="!isMobile"
      bordered
      collapse-mode="width"
      :collapsed-width="84"
      :width="300"
      :collapsed="collapsed"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
      content-style="padding: 16px 0;"
      class="desktop-sider"
    >
      <div style="padding: 0 24px 24px; display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.3s;" :style="{ padding: collapsed ? '0 0 24px' : '0 24px 24px' }">
        <div :style="{ width: collapsed ? '32px' : '40px', height: collapsed ? '32px' : '40px', borderRadius: '8px', background: '#f472b6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: collapsed ? '16px' : '20px', transition: 'all 0.3s' }">⛏</div>
        <div v-show="!collapsed" style="font-size: 22px; font-weight: 700; white-space: nowrap; letter-spacing: 0.5px; transition: opacity 0.3s;">
          MC 管理面板
        </div>
      </div>
      <NMenu
        :value="activeKey"
        :collapsed="collapsed"
        :collapsed-width="84"
        :collapsed-icon-size="24"
        :options="menuOptions"
        :icon-size="20"
        @update:value="handleMenuUpdate"
      />
    </NLayoutSider>

    <NLayout class="main-layout">
      <!-- Header -->
      <NLayoutHeader class="top-header" bordered style="height: 64px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between;">
        <div class="header-logo mobile-only" style="display: flex; align-items: center; gap: 8px;">
          <div :style="{ width: '40px', height: '40px', borderRadius: '8px', background: '#f472b6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }">⛏</div>
          <div class="mobile-title" style="font-size: 22px; font-weight: 700; white-space: nowrap; letter-spacing: 0.5px;">
          MC 管理面板
        </div>
        </div>
        <div class="desktop-only"></div>
        <NSpace align="center" :size="16" :wrap="false" style="flex-shrink: 0;">
          <NText depth="2" class="desktop-only">{{ authStore.username }}，欢迎回来</NText>
          <NButton circle size="small" secondary @click="handleThemeToggle">
            <template #icon>
              <NIcon :component="isDark ? MoonOutline : SunnyOutline" />
            </template>
          </NButton>
          <NButton size="small" secondary type="primary" @click="authStore.logout()">退出登录</NButton>
        </NSpace>
      </NLayoutHeader>

      <!-- Content Area -->
      <NLayoutContent class="main-content" :style="{ background: isDark ? '#101014' : '#f3f4f6', overflowX: 'hidden' }">
        <div class="layout-container">
          <slot />
        </div>
      </NLayoutContent>
    </NLayout>

    <!-- Mobile Bottom Tab Bar -->
    <div class="mobile-tabbar">
      <div 
        v-for="item in navItems" 
        :key="item.key"
        class="mobile-tab-item"
        :class="{ active: activeKey === item.key }"
        @click="handleMenuUpdate(item.key)"
      >
        <n-icon size="24" :component="item.icon" />
        <span>{{ item.label }}</span>
      </div>
    </div>
  </NLayout>
</template>

<style scoped>
.layout-container {
  max-width: 100%;
  margin: 0 auto;
}

.main-content {
  padding: 16px 24px;
}

.mobile-tabbar {
  display: none;
}

.mobile-only {
  display: none !important;
}

@media (max-width: 1024px) {
  .desktop-sider {
    display: none !important;
  }
  
  .desktop-only {
    display: none !important;
  }

  .mobile-only {
    display: flex !important;
  }

  .top-header {
    padding: 0 16px !important;
  }

  .mobile-title {
    font-size: 17px !important;
  }

  .main-content {
    padding: 16px !important;
    /* Add bottom padding to account for fixed tab bar and safe area */
    padding-bottom: calc(16px + 64px + env(safe-area-inset-bottom)) !important;
  }

  .mobile-tabbar {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(64px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--card-color, rgba(24, 24, 28, 0.9));
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.09));
    z-index: 100;
  }

  .mobile-tab-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-color-3, rgba(255, 255, 255, 0.5));
    font-size: 11px;
    gap: 4px;
    transition: color 0.2s;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .mobile-tab-item.active {
    color: #f472b6;
  }
}
</style>
