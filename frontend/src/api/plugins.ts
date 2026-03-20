import { http } from './http'
import type { PluginInfo } from '../types'

export function getPlugins() {
  return http.get<{ plugins: PluginInfo[] }>('/plugins')
}

export function disablePlugin(fileName: string) {
  return http.post(`/plugins/${fileName}/disable`)
}

export function enablePlugin(fileName: string) {
  return http.post(`/plugins/${fileName}/enable`)
}
