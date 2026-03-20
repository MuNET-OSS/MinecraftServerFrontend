import { onMounted, onUnmounted } from 'vue'
import { useSocket } from './useSocket'
import { useLogStore } from '../stores/logs'

/**
 * Initialize global log streaming.
 * Call once in App.vue — logs are collected regardless of current page.
 *
 * On Socket.IO reconnect, the server re-sends console:history.
 * We detect reconnects to force-refresh the log buffer so the console
 * never appears "frozen".
 */
export function useGlobalLogStream() {
  const { connect, on, off } = useSocket()
  const logStore = useLogStore()

  let isFirstConnect = true

  function handleConnect() {
    if (isFirstConnect) {
      isFirstConnect = false
      return
    }
    console.log('[LogStream] Reconnected — will force-refresh history')
  }

  function handleHistory(data: { lines: string[] }) {
    const force = !isFirstConnect || logStore.lines.length > 0
    logStore.setHistory(data.lines, force)
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
    on('connect', handleConnect)
    on('console:history', handleHistory)
    on('console:log', handleLog)
    on('console:response', handleResponse)
  })

  onUnmounted(() => {
    off('connect', handleConnect)
    off('console:history', handleHistory)
    off('console:log', handleLog)
    off('console:response', handleResponse)
  })
}
