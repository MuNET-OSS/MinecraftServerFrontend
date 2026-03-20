<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

const props = defineProps<{
  lines?: string[]
}>()

const termRef = ref<HTMLDivElement>()
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null

function writeLine(text: string) {
  terminal?.writeln(text)
  terminal?.scrollToBottom()
}

function writeLines(lines: string[]) {
  for (const line of lines) {
    terminal?.writeln(line)
  }
  terminal?.scrollToBottom()
}

onMounted(() => {
  terminal = new Terminal({
    theme: {
      background: '#1e1e2e',
      foreground: '#cdd6f4',
      cursor: '#f5e0dc',
    },
    fontSize: 16,
    fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace',
    disableStdin: true,
    cursorBlink: false,
    scrollback: 1000,
    allowProposedApi: true,
    macOptionIsMeta: true,
  })

  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  
  if (termRef.value) {
    terminal.open(termRef.value)
    
    // Explicitly fix mobile scrolling by forcing the viewport to handle touches
    const viewport = termRef.value.querySelector('.xterm-viewport') as HTMLElement
    if (viewport) {
      viewport.style.overflowY = 'auto'
      viewport.style.touchAction = 'pan-y'
    }
    
    const screen = termRef.value.querySelector('.xterm-screen') as HTMLElement
    if (screen) {
      screen.style.touchAction = 'none' // Disable zooming/panning on the text layer itself
    }
    fitAddon.fit()
  }

  const resizeObserver = new ResizeObserver(() => fitAddon?.fit())
  if (termRef.value) resizeObserver.observe(termRef.value)
})

onUnmounted(() => {
  terminal?.dispose()
})

defineExpose({ writeLine, writeLines })
</script>

<template>
  <div ref="termRef" style="height: 100%; width: 100%;"></div>
</template>

<style scoped>
:deep(.xterm .xterm-viewport) {
  overflow-y: auto !important;
  touch-action: pan-y !important;
  -webkit-overflow-scrolling: touch !important;
}
:deep(.xterm-screen) {
  touch-action: pan-y !important;
}
</style>
