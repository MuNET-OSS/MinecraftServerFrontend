import { http } from './http'

export function getPlayers() {
  return http.get<{ online: number; max: number; players: { name: string }[] }>('/players')
}

export function kickPlayer(name: string, reason?: string) {
  return http.post(`/players/${name}/kick`, { reason })
}

export function banPlayer(name: string, reason?: string) {
  return http.post(`/players/${name}/ban`, { reason })
}
