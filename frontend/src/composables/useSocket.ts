import { ref } from 'vue'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

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
    socket?.disconnect()
    socket = null
    connected.value = false
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

  return { connected, connect, disconnect, on, off, emit, socket: () => socket }
}
