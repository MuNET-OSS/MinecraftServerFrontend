/**
 * Demo mode initializer.
 *
 * When activated, intercepts ALL axios requests with mock responses.
 * Socket.IO is handled by useSocket + demoSocket.
 *
 * Activate: set VITE_DEMO=true
 */
import { http } from '../api/http'
import {
  DEMO_TOKEN,
  DEMO_USERNAME,
  mockPlayers,
  mockAnnouncements,
  mockPlugins,
  mockServerCommands,
  generateMockServerStatus,
  generateMockUptimeMonitors,
  generateMockUptimeHistory,
} from './data'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'

// ─── Mutable State ───
let announcements = [...mockAnnouncements]
let plugins = [...mockPlugins]
let nextAnnouncementId = announcements.length + 1

// ─── Helper ───
function fakeResponse<T>(data: T, config: InternalAxiosRequestConfig): AxiosResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config }
}

// ─── Route Matcher ───
function matchRoute(url: string, method: string, config: InternalAxiosRequestConfig): unknown {
  // Auth
  if (url === '/auth/login' && method === 'post') {
    return { token: DEMO_TOKEN }
  }

  // Players
  if (url === '/players' && method === 'get') {
    return mockPlayers
  }
  if (url.match(/^\/players\/\w+\/kick$/) && method === 'post') {
    return { success: true }
  }
  if (url.match(/^\/players\/\w+\/ban$/) && method === 'post') {
    return { success: true }
  }

  // Announcements
  if (url === '/announcements' && method === 'get') {
    const params = config.params || {}
    const page = params.page || 1
    const limit = params.limit || 10
    const start = (page - 1) * limit
    return { announcements: announcements.slice(start, start + limit), total: announcements.length, page, limit }
  }
  if (url === '/announcements' && method === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    const newAnn = {
      id: nextAnnouncementId++,
      title: body.title || 'New Announcement',
      content: body.content || '',
      is_pinned: body.is_pinned || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    announcements.unshift(newAnn)
    return newAnn
  }
  if (url.match(/^\/announcements\/\d+$/) && method === 'put') {
    const id = parseInt(url.split('/').pop()!)
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    const ann = announcements.find(a => a.id === id)
    if (ann) {
      Object.assign(ann, body, { updated_at: new Date().toISOString() })
      return ann
    }
    return { error: 'Not found' }
  }
  if (url.match(/^\/announcements\/\d+$/) && method === 'delete') {
    const id = parseInt(url.split('/').pop()!)
    announcements = announcements.filter(a => a.id !== id)
    return { success: true }
  }
  if (url.match(/^\/announcements\/\d+\/broadcast$/) && method === 'post') {
    return { success: true }
  }

  // Plugins
  if (url === '/plugins' && method === 'get') {
    return { plugins }
  }
  if (url.match(/^\/plugins\/.+\/disable$/) && method === 'post') {
    const fileName = decodeURIComponent(url.split('/plugins/')[1].split('/disable')[0])
    const p = plugins.find(pl => pl.fileName === fileName)
    if (p) p.enabled = false
    return { success: true }
  }
  if (url.match(/^\/plugins\/.+\/enable$/) && method === 'post') {
    const fileName = decodeURIComponent(url.split('/plugins/')[1].split('/enable')[0])
    const p = plugins.find(pl => pl.fileName === fileName)
    if (p) p.enabled = true
    return { success: true }
  }

  // Server / Uptime
  if (url === '/server/uptime' && method === 'get') {
    return generateMockUptimeMonitors()
  }
  if (url === '/server/uptime/history' && method === 'get') {
    return generateMockUptimeHistory()
  }
  if (url === '/server/commands' && method === 'get') {
    return { commands: mockServerCommands }
  }
  if (url === '/server/restart' && method === 'post') {
    return { success: true }
  }
  if (url === '/server/tabcomplete' && method === 'post') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    const input = (body.input || '').toLowerCase().trim()
    if (!input) return { suggestions: mockServerCommands.slice(0, 10) }
    return { suggestions: mockServerCommands.filter(c => c.startsWith(input)) }
  }

  // Console
  if (url === '/console/execute' && method === 'post') {
    return { success: true }
  }

  return undefined
}

// ─── Setup ───
function setupAxiosMock() {
  // Intercept requests before they hit the network
  http.interceptors.request.use((config) => {
    const url = config.url || ''
    const method = (config.method || 'get').toLowerCase()
    const mock = matchRoute(url, method, config)
    if (mock !== undefined) {
      return Promise.reject({ __mock: true, response: fakeResponse(mock, config) })
    }
    return config
  })

  // Convert mock rejections to resolved responses
  http.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.__mock) {
        return Promise.resolve(error.response)
      }
      return Promise.reject(error)
    }
  )
}

export function initDemoMode() {
  console.log(
    '%c🎮 DEMO MODE %c Mock data · No backend required',
    'background: #f472b6; color: #fff; padding: 4px 8px; border-radius: 4px 0 0 4px; font-weight: bold;',
    'background: #1e1e2e; color: #cdd6f4; padding: 4px 8px; border-radius: 0 4px 4px 0;'
  )

  // Auto-login
  localStorage.setItem('token', DEMO_TOKEN)
  localStorage.setItem('username', DEMO_USERNAME)

  setupAxiosMock()
}
