/**
 * Demo socket: emits fake server events (status, logs) via demoEmit.
 */
import { demoEmit } from '../composables/useSocket'
import {
  generateMockServerStatus,
  mockConsoleLogs,
  getRandomLogLine,
} from './data'

let started = false

export function startDemoSocket() {
  if (started) return
  started = true

  // Send initial data after a tick so handlers are registered
  setTimeout(() => {
    demoEmit('rcon:status', { status: 'connected' })
    demoEmit('server:status', generateMockServerStatus())
    demoEmit('console:history', { lines: mockConsoleLogs })
  }, 200)

  // Server status every 5s
  setInterval(() => {
    demoEmit('server:status', generateMockServerStatus())
  }, 5000)

  // Random console log every 3-7s
  function scheduleLog() {
    const delay = 3000 + Math.random() * 4000
    setTimeout(() => {
      demoEmit('console:log', { line: getRandomLogLine() })
      scheduleLog()
    }, delay)
  }
  scheduleLog()
}
