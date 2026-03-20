import { http } from './http'
import type { Announcement } from '../types'

export function getAnnouncements(page = 1, limit = 10) {
  return http.get<{ announcements: Announcement[]; total: number; page: number; limit: number }>('/announcements', { params: { page, limit } })
}

export function createAnnouncement(data: { title: string; content: string; is_pinned?: boolean }) {
  return http.post<Announcement>('/announcements', data)
}

export function updateAnnouncement(id: number, data: { title?: string; content?: string; is_pinned?: boolean }) {
  return http.put<Announcement>(`/announcements/${id}`, data)
}

export function deleteAnnouncement(id: number) {
  return http.delete(`/announcements/${id}`)
}

export function broadcastAnnouncement(id: number, options?: { color?: string; mode?: string }) {
  return http.post(`/announcements/${id}/broadcast`, options || {})
}
