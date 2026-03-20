<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useMessage } from 'naive-ui'
import XTerminal from '../components/XTerminal.vue'
import { useLogStore } from '../stores/logs'
import { useSocket } from '../composables/useSocket'
import { http } from '../api/http'

const message = useMessage()
const logStore = useLogStore()
const { disconnect, connect } = useSocket()

const terminalRef = ref<InstanceType<typeof XTerminal>>()
const commandInput = ref('')
const sending = ref(false)
const refreshing = ref(false)

// Load command history from localStorage
const savedHistory = localStorage.getItem('mc_command_history')
const commandHistory = ref<string[]>(savedHistory ? JSON.parse(savedHistory) : [])
const historyIndex = ref(-1)

// Server commands for auto-completion (fetched dynamically from the server)
const serverCommands = ref<string[]>([])
const tabCompleting = ref(false)

// Track how many lines we've already rendered
let renderedCount = 0

function renderPendingLines() {
  if (!terminalRef.value) return
  const allLines = logStore.lines
  if (allLines.length > renderedCount) {
    const newLines = allLines.slice(renderedCount)
    terminalRef.value.writeLines(newLines)
    renderedCount = allLines.length
  }
}

async function loadServerCommands() {
  try {
    const res = await http.get<{ commands: string[] }>('/server/commands')
    serverCommands.value = res.data.commands
  } catch {
    // silent
  }
}

function handleRefresh() {
  refreshing.value = true
  disconnect()
  logStore.markUninitialized()
  setTimeout(() => {
    connect()
    logStore.markInitialized()
    refreshing.value = false
    message.success('日志已刷新')
  }, 500)
}

onMounted(() => {
  renderedCount = 0
  renderPendingLines()
  loadServerCommands()
})

// Watch for new lines arriving in the store
const stopWatch = watch(
  () => logStore.lines.length,
  () => renderPendingLines()
)

onUnmounted(() => {
  stopWatch()
})

async function sendCommand() {
  const cmd = commandInput.value.trim()
  if (!cmd) return
  
  sending.value = true
  
  // Save to history if it's not the same as the last command
  const lastCmd = commandHistory.value[commandHistory.value.length - 1]
  if (cmd !== lastCmd) {
    commandHistory.value.push(cmd)
    if (commandHistory.value.length > 100) {
      commandHistory.value.shift()
    }
    localStorage.setItem('mc_command_history', JSON.stringify(commandHistory.value))
  }
  
  historyIndex.value = -1
  commandInput.value = ''
  
  try {
    await http.post('/console/execute', { command: cmd })
  } catch (err: any) {
    const errorMsg = err?.response?.data?.error || '命令执行失败'
    message.error(errorMsg)
    logStore.addLine(`\x1b[31m错误: ${errorMsg}\x1b[0m`)
  } finally {
    sending.value = false
  }
}

function getCommonPrefix(words: string[]) {
  if (!words || words.length === 0) return ''
  let prefix = words[0]
  for (let i = 1; i < words.length; i++) {
    while (words[i].indexOf(prefix) !== 0) {
      prefix = prefix.substring(0, prefix.length - 1)
      if (prefix === '') return ''
    }
  }
  return prefix
}

async function handleTabCompletion() {
  // IMPORTANT: Don't trim — trailing space means user wants subcommand completion
  const raw = commandInput.value
  if (!raw.trim() || tabCompleting.value) return

  // Strip leading slash for the API call, but preserve trailing space
  const input = raw.replace(/^\//, '')

  tabCompleting.value = true
  try {
    const res = await http.post<{ suggestions: string[] }>('/server/tabcomplete', { input })
    const suggestions = res.data.suggestions || []

    if (suggestions.length === 0) return

    // Determine what part of the input we're completing
    // The server returns completions for the LAST token
    const parts = input.split(' ')
    const lastPart = parts[parts.length - 1]
    // If input ends with space, lastPart is "" — prefix is the whole input
    const prefix = input.substring(0, input.length - lastPart.length)
    const hadSlash = raw.startsWith('/')

    if (suggestions.length === 1) {
      commandInput.value = (hadSlash ? '/' : '') + prefix + suggestions[0] + ' '
    } else {
      const common = getCommonPrefix(suggestions)
      if (common.length > lastPart.length) {
        commandInput.value = (hadSlash ? '/' : '') + prefix + common
      } else if (suggestions.length <= 40) {
        logStore.addLine(`\x1b[36m补全提示: \x1b[33m${suggestions.join(', ')}\x1b[0m`)
      } else {
        logStore.addLine(`\x1b[36m匹配到 ${suggestions.length} 个选项，请输入更多字符\x1b[0m`)
      }
    }
  } catch {
    // Fallback to local command list
    const input2 = raw.replace(/^\//, '').trim().toLowerCase()
    if (!input2.includes(' ') && serverCommands.value.length > 0) {
      const matches = serverCommands.value.filter(cmd => cmd.toLowerCase().startsWith(input2))
      if (matches.length === 1) {
        commandInput.value = (raw.startsWith('/') ? '/' : '') + matches[0] + ' '
      } else if (matches.length > 1 && matches.length <= 30) {
        logStore.addLine(`\x1b[36m补全提示: \x1b[33m${matches.join(', ')}\x1b[0m`)
      }
    }
  } finally {
    tabCompleting.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (commandHistory.value.length === 0) return
    
    if (historyIndex.value === -1) {
      historyIndex.value = commandHistory.value.length - 1
    } else if (historyIndex.value > 0) {
      historyIndex.value--
    }
    commandInput.value = commandHistory.value[historyIndex.value]
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (historyIndex.value !== -1) {
      if (historyIndex.value < commandHistory.value.length - 1) {
        historyIndex.value++
        commandInput.value = commandHistory.value[historyIndex.value]
      } else {
        historyIndex.value = -1
        commandInput.value = ''
      }
    }
  } else if (e.key === 'Tab') {
    e.preventDefault()
    handleTabCompletion()
  }
}

function handleInputEnter(e: KeyboardEvent) {
  e.preventDefault()
  sendCommand()
}
</script>

<template>
  <div class="console-container">
    <div class="terminal-wrapper">
      <XTerminal ref="terminalRef" />
    </div>
    <div class="input-bar">
      <button class="refresh-btn" :disabled="refreshing" @click="handleRefresh" title="刷新日志">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ spinning: refreshing }">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
      </button>
      <input
        ref="inputRef"
        v-model="commandInput"
        class="command-input"
        placeholder="输入命令... (↑↓ 历史记录，Tab 补全)"
        spellcheck="false"
        autocomplete="off"
        @keydown.enter="handleInputEnter"
        @keydown="handleKeydown"
      />
      <button class="send-btn" :disabled="sending" @click="sendCommand">
        {{ sending ? '...' : '发送' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.console-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 96px);
  width: 100%;
  padding: 0;
}

.terminal-wrapper {
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}

.input-bar {
  display: flex;
  gap: 8px;
  padding: 10px 0 0 0;
  flex-shrink: 0;
}

.refresh-btn {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border: 1px solid var(--command-input-border, #3a3a3c);
  border-radius: 8px;
  background: var(--command-input-bg, #1e1e2e);
  color: var(--command-input-color, #cdd6f4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, background 0.2s;
}
.refresh-btn:hover {
  border-color: #f472b6;
  background: rgba(244, 114, 182, 0.1);
}
.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.refresh-btn .spinning {
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.command-input {
  flex: 1;
  min-width: 0;
  height: 42px;
  padding: 0 14px;
  border: 1px solid var(--command-input-border, #3a3a3c);
  border-radius: 8px;
  background: var(--command-input-bg, #1e1e2e);
  color: var(--command-input-color, #cdd6f4);
  font-family: 'JetBrains Mono', Consolas, 'Courier New', monospace;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s, background 0.2s, color 0.2s;
  overflow-x: auto;
  white-space: nowrap;
}
.command-input:focus {
  border-color: #f472b6;
}
.command-input::placeholder {
  color: var(--text-color-3, #555);
}

.send-btn {
  flex-shrink: 0;
  height: 42px;
  padding: 0 20px;
  border: none;
  border-radius: 8px;
  background: #f472b6;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.send-btn:hover {
  background: #ec4899;
}
.send-btn:disabled {
  background: #333;
  cursor: not-allowed;
}

:deep(.xterm-viewport) {
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

@media (max-width: 1024px) {
  .console-container {
    height: calc(100vh - 150px);
  }
}
</style>
