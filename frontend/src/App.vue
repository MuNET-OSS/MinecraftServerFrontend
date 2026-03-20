<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import { 
  NMessageProvider, 
  NDialogProvider, 
  NConfigProvider
} from 'naive-ui'
import AdminLayout from './layouts/AdminLayout.vue'
import { useGlobalLogStream } from './composables/useGlobalLogStream'
import { useTheme } from './composables/useTheme'

const route = useRoute()
const isLoginPage = computed(() => route.name === 'login')

// Start global log streaming — logs are collected on all pages
useGlobalLogStream()

const { theme, themeOverrides } = useTheme()
</script>

<template>
  <NConfigProvider :theme="theme" :theme-overrides="themeOverrides">
    <NMessageProvider>
      <NDialogProvider>
        <RouterView v-if="isLoginPage" />
        <AdminLayout v-else>
          <RouterView v-slot="{ Component }">
            <transition name="fade-slide" mode="out-in">
              <component :is="Component" />
            </transition>
          </RouterView>
        </AdminLayout>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
