import { ref } from 'vue'
import { useSocket } from './useSocket'
import type { ServerStatus } from '../types'

// Global state so it persists across component mount/unmount
const tps = ref<ServerStatus['tps']>(null)
const players = ref<ServerStatus['players']>(null)
const memory = ref<ServerStatus['memory']>(null)
const cpu = ref<ServerStatus['cpu']>(null)
const mspt = ref<ServerStatus['mspt']>(null)
const rconStatus = ref<'connected' | 'disconnected' | 'reconnecting'>('disconnected')

let initialized = false

export function useServerStatus() {
  const { connect, on } = useSocket()
  
  function handleStatus(data: ServerStatus) {
    tps.value = data.tps
    players.value = data.players
    memory.value = data.memory
    cpu.value = data.cpu
    mspt.value = data.mspt ?? null
    // Backend now sends bridgeStatus instead of rconStatus
    rconStatus.value = data.bridgeStatus || data.rconStatus || 'disconnected'
  }

  function handleRconStatus(data: { status: 'connected' | 'disconnected' | 'reconnecting' }) {
    rconStatus.value = data.status
  }

  if (!initialized) {
    connect()
    on('server:status', handleStatus)
    on('rcon:status', handleRconStatus)
    initialized = true
  }

  return { tps, players, memory, cpu, mspt, rconStatus }
}
