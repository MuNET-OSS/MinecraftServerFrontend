import { ref, computed, watch } from 'vue';
import { darkTheme } from 'naive-ui';
import type { GlobalThemeOverrides } from 'naive-ui';

const STORAGE_KEY = 'mc_theme';
const initialTheme = localStorage.getItem(STORAGE_KEY) || 'dark';
const isDark = ref(initialTheme === 'dark');

watch(isDark, (val) => {
  const themeName = val ? 'dark' : 'light';
  localStorage.setItem(STORAGE_KEY, themeName);
  
  if (val) {
    document.documentElement.classList.remove('light-theme');
    document.documentElement.classList.add('dark-theme');
  } else {
    document.documentElement.classList.remove('dark-theme');
    document.documentElement.classList.add('light-theme');
  }
}, { immediate: true });

const toggleTheme = () => {
  // The circular expansion animation is handled in the component
  isDark.value = !isDark.value;
};

// Common accent colors
const commonColors = {
  primaryColor: '#f472b6',
  primaryColorHover: '#f9a8d4',
  primaryColorPressed: '#ec4899',
  primaryColorSuppl: '#f472b6',
  borderRadius: '8px',
  fontFamily: '"JetBrains Mono", system-ui, -apple-system, sans-serif'
};

const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    ...commonColors,
    bodyColor: '#101014',
    cardColor: 'rgba(24, 24, 28, 0.8)',
    modalColor: 'rgba(24, 24, 28, 0.9)',
    popoverColor: 'rgba(24, 24, 28, 0.9)'
  },
  Card: {
    borderColor: 'rgba(255, 255, 255, 0.09)',
    color: '#18181c'
  }
};

const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    ...commonColors,
    bodyColor: '#f3f4f6',
    cardColor: 'rgba(255, 255, 255, 0.9)',
    modalColor: 'rgba(255, 255, 255, 0.95)',
    popoverColor: 'rgba(255, 255, 255, 0.95)'
  },
  Card: {
    borderColor: 'rgba(0, 0, 0, 0.09)',
    color: '#ffffff'
  }
};

export function useTheme() {
  const theme = computed(() => isDark.value ? darkTheme : null);
  const themeOverrides = computed(() => isDark.value ? darkThemeOverrides : lightThemeOverrides);

  return {
    isDark,
    toggleTheme,
    theme,
    themeOverrides
  };
}
