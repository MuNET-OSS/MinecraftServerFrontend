import { defineStore } from 'pinia'
import { ref } from 'vue'

const MAX_LINES = 2000
const STORAGE_KEY = 'mc_console_logs'

export const useLogStore = defineStore('logs', () => {
  // Restore logs from sessionStorage on init
  const saved = sessionStorage.getItem(STORAGE_KEY)
  const lines = ref<string[]>(saved ? JSON.parse(saved) : [])
  const initialized = ref(false)

  function persist() {
    // Only keep last 500 lines in storage to avoid quota issues
    const toSave = lines.value.slice(-500)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch {
      // storage full — clear and retry
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }

  function addLine(line: string) {
    lines.value.push(line)
    if (lines.value.length > MAX_LINES) {
      lines.value = lines.value.slice(-MAX_LINES)
    }
    persist()
  }

  function setHistory(historyLines: string[]) {
    // Only set history if we have no existing logs (first connect)
    // If we already have logs from sessionStorage, just append new ones
    if (lines.value.length === 0) {
      lines.value = historyLines.slice(-MAX_LINES)
      persist()
    }
  }

  function addCommandResponse(command: string, result: string) {
    addLine(`\x1b[36m> ${command}\x1b[0m`)
    if (result) {
      addLine(`\x1b[33m${result}\x1b[0m`)
    }
  }

  function markInitialized() {
    initialized.value = true
  }

  return { lines, initialized, addLine, setHistory, addCommandResponse, markInitialized }
})
