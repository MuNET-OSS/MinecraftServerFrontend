import { ref, computed, watch } from 'vue';
import { darkTheme } from 'naive-ui';
import type { GlobalThemeOverrides } from 'naive-ui';

// ─── Color Presets ───

export interface ColorPreset {
  name: string;
  base: string;
  hover: string;
  pressed: string;
}

export const colorPresets: ColorPreset[] = [
  { name: '粉红', base: '#f472b6', hover: '#f9a8d4', pressed: '#ec4899' },
  { name: '蓝色', base: '#60a5fa', hover: '#93c5fd', pressed: '#3b82f6' },
  { name: '紫色', base: '#a78bfa', hover: '#c4b5fd', pressed: '#8b5cf6' },
  { name: '绿色', base: '#4ade80', hover: '#86efac', pressed: '#22c55e' },
  { name: '橙色', base: '#fb923c', hover: '#fdba74', pressed: '#f97316' },
  { name: '红色', base: '#f87171', hover: '#fca5a5', pressed: '#ef4444' },
  { name: '青色', base: '#2dd4bf', hover: '#5eead4', pressed: '#14b8a6' },
  { name: '琥珀', base: '#fbbf24', hover: '#fcd34d', pressed: '#f59e0b' },
];

// ─── Color Utilities (Material You tonal palette) ───

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('');
}

/** Mix accent into a base color at given weight (0-100) */
function tint(accent: string, base: string, weight: number): string {
  const [ar, ag, ab] = hexToRgb(accent);
  const [br, bg, bb] = hexToRgb(base);
  const w = weight / 100;
  return rgbToHex(ar * w + br * (1 - w), ag * w + bg * (1 - w), ab * w + bb * (1 - w));
}

/** Generate rgba string from accent with alpha */
function accentAlpha(accent: string, alpha: number): string {
  const [r, g, b] = hexToRgb(accent);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface TonalPalette {
  body: string;
  surface: string;        // card background
  surfaceHigh: string;    // elevated cards, popovers
  border: string;
  borderSubtle: string;
  activeIndicator: string; // selected menu item bg
  scrollThumb: string;
  scrollThumbHover: string;
  inputBg: string;
  inputBorder: string;
  loginBg: string;
}

function generateTonalPalette(accent: string, dark: boolean): TonalPalette {
  if (dark) {
    return {
      body: tint(accent, '#101014', 4),
      surface: tint(accent, '#18181c', 6),
      surfaceHigh: tint(accent, '#1e1e22', 8),
      border: accentAlpha(accent, 0.12),
      borderSubtle: accentAlpha(accent, 0.06),
      activeIndicator: accentAlpha(accent, 0.15),
      scrollThumb: accentAlpha(accent, 0.2),
      scrollThumbHover: accentAlpha(accent, 0.35),
      inputBg: accentAlpha(accent, 0.05),
      inputBorder: accentAlpha(accent, 0.12),
      loginBg: tint(accent, '#0d0d12', 3),
    };
  }
  return {
    body: tint(accent, '#f0f1f3', 8),
    surface: tint(accent, '#ffffff', 10),
    surfaceHigh: tint(accent, '#ffffff', 14),
    border: accentAlpha(accent, 0.2),
    borderSubtle: accentAlpha(accent, 0.1),
    activeIndicator: accentAlpha(accent, 0.18),
    scrollThumb: accentAlpha(accent, 0.25),
    scrollThumbHover: accentAlpha(accent, 0.4),
    inputBg: tint(accent, '#ffffff', 5),
    inputBorder: accentAlpha(accent, 0.25),
    loginBg: tint(accent, '#f5f6f8', 6),
  };
}

// ─── Persistent State ───

const THEME_KEY = 'mc_theme';
const COLOR_KEY = 'mc_accent_color';

const initialTheme = localStorage.getItem(THEME_KEY) || 'dark';
const isDark = ref(initialTheme === 'dark');

const savedColorIndex = parseInt(localStorage.getItem(COLOR_KEY) || '0', 10);
const accentIndex = ref(
  savedColorIndex >= 0 && savedColorIndex < colorPresets.length ? savedColorIndex : 0
);
const accentColor = computed(() => colorPresets[accentIndex.value]);

// ─── CSS Variable Injection ───

function applyAllCssVars(preset: ColorPreset, dark: boolean) {
  const root = document.documentElement;
  const p = generateTonalPalette(preset.base, dark);

  // Accent colors
  root.style.setProperty('--accent-color', preset.base);
  root.style.setProperty('--accent-hover', preset.hover);
  root.style.setProperty('--accent-pressed', preset.pressed);

  // Material You tonal surfaces
  root.style.setProperty('--body-bg', p.body);
  root.style.setProperty('--card-color', p.surface);
  root.style.setProperty('--surface-high', p.surfaceHigh);
  root.style.setProperty('--border-color', p.border);
  root.style.setProperty('--border-subtle', p.borderSubtle);
  root.style.setProperty('--active-indicator', p.activeIndicator);
  root.style.setProperty('--scrollbar-thumb', p.scrollThumb);
  root.style.setProperty('--scrollbar-thumb-hover', p.scrollThumbHover);
  root.style.setProperty('--command-input-bg', p.inputBg);
  root.style.setProperty('--command-input-border', p.inputBorder);
  root.style.setProperty('--login-bg', p.loginBg);

  // Text colors stay neutral for readability
  root.style.setProperty('--body-color', dark ? 'rgba(255,255,255,0.82)' : '#333639');
  root.style.setProperty('--text-color-3', dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)');
  root.style.setProperty('--command-input-color', dark ? '#fff' : '#374151');
}

// ─── Watchers ───

function applyTheme() {
  const dark = isDark.value;
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  if (dark) {
    document.documentElement.classList.remove('light-theme');
    document.documentElement.classList.add('dark-theme');
  } else {
    document.documentElement.classList.remove('dark-theme');
    document.documentElement.classList.add('light-theme');
  }
  applyAllCssVars(colorPresets[accentIndex.value], dark);
}

watch(isDark, () => applyTheme(), { immediate: true });

watch(accentIndex, (idx) => {
  localStorage.setItem(COLOR_KEY, String(idx));
  applyAllCssVars(colorPresets[idx], isDark.value);
}, { immediate: true });

// ─── Actions ───

const toggleTheme = () => {
  isDark.value = !isDark.value;
};

function setAccentColor(index: number) {
  if (index >= 0 && index < colorPresets.length) {
    accentIndex.value = index;
  }
}

// ─── Naive UI Theme Overrides (reactive, Material You tonal) ───

const themeOverrides = computed<GlobalThemeOverrides>(() => {
  const c = accentColor.value;
  const dark = isDark.value;
  const p = generateTonalPalette(c.base, dark);

  const common = {
    primaryColor: c.base,
    primaryColorHover: c.hover,
    primaryColorPressed: c.pressed,
    primaryColorSuppl: c.base,
    borderRadius: '8px',
    fontFamily: '"JetBrains Mono", system-ui, -apple-system, sans-serif',
  };

  if (dark) {
    return {
      common: {
        ...common,
        bodyColor: p.body,
        cardColor: p.surface,
        modalColor: p.surfaceHigh,
        popoverColor: p.surfaceHigh,
        hoverColor: accentAlpha(c.base, 0.08),
        pressedColor: accentAlpha(c.base, 0.12),
        tableHeaderColor: p.surface,
        inputColor: accentAlpha(c.base, 0.05),
        inputColorDisabled: accentAlpha(c.base, 0.03),
        actionColor: p.surface,
        dividerColor: p.border,
        borderColor: p.border,
        scrollbarColor: p.scrollThumb,
        scrollbarColorHover: p.scrollThumbHover,
      },
      Card: {
        borderColor: p.border,
        color: p.surface,
      },
      Menu: {
        itemTextColorActive: c.base,
        itemIconColorActive: c.base,
        itemTextColorActiveHover: c.hover,
        itemIconColorActiveHover: c.hover,
        itemColorActive: p.activeIndicator,
        itemColorActiveHover: accentAlpha(c.base, 0.2),
        itemColorActiveCollapsed: p.activeIndicator,
      },
      Tag: {
        borderPrimary: accentAlpha(c.base, 0.3),
        colorPrimary: accentAlpha(c.base, 0.12),
        textColorPrimary: c.base,
      },
      Progress: {
        railColor: accentAlpha(c.base, 0.12),
      },
      Button: {
        colorSecondary: accentAlpha(c.base, 0.08),
        colorSecondaryHover: accentAlpha(c.base, 0.12),
        colorSecondaryPressed: accentAlpha(c.base, 0.16),
        textColorSecondary: c.base,
        borderSecondary: 'transparent',
        borderSecondaryHover: 'transparent',
        borderSecondaryPressed: 'transparent',
      },
    };
  }

  return {
    common: {
      ...common,
      bodyColor: p.body,
      cardColor: p.surface,
      modalColor: p.surfaceHigh,
      popoverColor: p.surfaceHigh,
      hoverColor: accentAlpha(c.base, 0.1),
      pressedColor: accentAlpha(c.base, 0.16),
      tableHeaderColor: p.surface,
      inputColor: tint(c.base, '#ffffff', 4),
      inputColorDisabled: accentAlpha(c.base, 0.05),
      actionColor: p.surface,
      dividerColor: p.border,
      borderColor: p.border,
      scrollbarColor: p.scrollThumb,
      scrollbarColorHover: p.scrollThumbHover,
    },
    Card: {
      borderColor: p.border,
      color: p.surface,
    },
    Menu: {
      itemTextColorActive: c.pressed,
      itemIconColorActive: c.pressed,
      itemTextColorActiveHover: c.base,
      itemIconColorActiveHover: c.base,
      itemColorActive: p.activeIndicator,
      itemColorActiveHover: accentAlpha(c.base, 0.22),
      itemColorActiveCollapsed: p.activeIndicator,
    },
    Tag: {
      borderPrimary: accentAlpha(c.base, 0.35),
      colorPrimary: accentAlpha(c.base, 0.14),
      textColorPrimary: c.pressed,
    },
    Progress: {
      railColor: accentAlpha(c.base, 0.15),
    },
    Button: {
      colorSecondary: accentAlpha(c.base, 0.12),
      colorSecondaryHover: accentAlpha(c.base, 0.18),
      colorSecondaryPressed: accentAlpha(c.base, 0.24),
      textColorSecondary: c.pressed,
      borderSecondary: 'transparent',
      borderSecondaryHover: 'transparent',
      borderSecondaryPressed: 'transparent',
    },
  };
});

// ─── Export ───

export function useTheme() {
  const theme = computed(() => isDark.value ? darkTheme : null);

  return {
    isDark,
    toggleTheme,
    theme,
    themeOverrides,
    accentColor,
    accentIndex,
    setAccentColor,
  };
}
