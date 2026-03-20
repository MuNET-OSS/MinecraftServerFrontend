import { ref } from 'vue'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

// ── Demo mode fake socket ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const demoHandlers: Record<string, ((...args: any[]) => void)[]> = {}
let demoInitialized = false

export function isDemo(): boolean {
  return import.meta.env.VITE_DEMO === 'true'
}

/**
 * Emit an event to all registered demo handlers.
 * Called from the mock module to push fake data.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function demoEmit(event: string, ...args: any[]) {
  const list = demoHandlers[event]
  if (list) list.forEach(h => h(...args))
}

export function useSocket() {
  const connected = ref(false)

  function connect() {
    const token = localStorage.getItem('token')
    if (!token) return

    if (isDemo()) {
      connected.value = true
      if (!demoInitialized) {
        demoInitialized = true
        // Lazy-import mock to emit initial events
        import('../mock/demoSocket').then(m => m.startDemoSocket())
      }
      return
    }

    // Already have a socket instance — don't recreate
    if (socket) {
      connected.value = socket.connected
      return
    }

    socket = io({
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    })

    socket.on('connect', () => { connected.value = true })
    socket.on('disconnect', () => { connected.value = false })
  }

  function disconnect() {
    if (isDemo()) {
      // No-op in demo mode
      return
    }
    socket?.disconnect()
    socket = null
    connected.value = false
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function on(event: string, handler: (...args: any[]) => void) {
    if (isDemo()) {
      if (!demoHandlers[event]) demoHandlers[event] = []
      demoHandlers[event].push(handler)
      return
    }
    socket?.on(event, handler)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function off(event: string, handler: (...args: any[]) => void) {
    if (isDemo()) {
      if (demoHandlers[event]) {
        demoHandlers[event] = demoHandlers[event].filter(h => h !== handler)
      }
      return
    }
    socket?.off(event, handler)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function emit(event: string, ...args: any[]) {
    if (isDemo()) return // No-op
    socket?.emit(event, ...args)
  }

  return { connected, connect, disconnect, on, off, emit, socket: () => socket }
}
