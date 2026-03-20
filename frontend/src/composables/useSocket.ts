import { ref } from 'vue'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null
let firstConnect = true

export function useSocket() {
  const connected = ref(false)

  function connect() {
    const token = localStorage.getItem('token')
    if (!token) return

    // Already have a socket instance — don't recreate
    if (socket) {
      connected.value = socket.connected
      return
    }

    firstConnect = true

    socket = io({
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    })

    socket.on('connect', () => {
      connected.value = true
      if (!firstConnect) {
        console.log('[Socket] Reconnected')
      }
      firstConnect = false
    })
    socket.on('disconnect', (reason) => {
      connected.value = false
      console.warn('[Socket] Disconnected:', reason)
    })
  }

  function disconnect() {
    socket?.disconnect()
    socket = null
    firstConnect = true
    connected.value = false
  }

  function reconnect() {
    if (socket) {
      socket.disconnect()
      socket.connect()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function on(event: string, handler: (...args: any[]) => void) {
    socket?.on(event, handler)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function off(event: string, handler: (...args: any[]) => void) {
    socket?.off(event, handler)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function emit(event: string, ...args: any[]) {
    socket?.emit(event, ...args)
  }

  return { connected, connect, disconnect, reconnect, on, off, emit, socket: () => socket }
}
