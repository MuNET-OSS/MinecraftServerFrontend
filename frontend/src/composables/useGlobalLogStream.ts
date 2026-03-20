import { onMounted, onUnmounted } from 'vue'
import { useSocket } from './useSocket'
import { useLogStore } from '../stores/logs'

/**
 * Initialize global log streaming.
 * Call once in App.vue — logs are collected regardless of current page.
 */
export function useGlobalLogStream() {
  const { connect, on, off } = useSocket()
  const logStore = useLogStore()

  function handleHistory(data: { lines: string[] }) {
    logStore.setHistory(data.lines)
  }

  function handleLog(data: { line: string }) {
    logStore.addLine(data.line)
  }

  function handleResponse(data: { command: string; result: string }) {
    logStore.addCommandResponse(data.command, data.result)
  }

  onMounted(() => {
    if (!logStore.initialized) {
      connect()
      logStore.markInitialized()
    }
    on('console:history', handleHistory)
    on('console:log', handleLog)
    on('console:response', handleResponse)
  })

  onUnmounted(() => {
    off('console:history', handleHistory)
    off('console:log', handleLog)
    off('console:response', handleResponse)
  })
}
