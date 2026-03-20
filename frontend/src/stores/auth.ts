import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { http } from '../api/http'
import router from '../router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const username = ref<string>(localStorage.getItem('username') || '')
  const isAuthenticated = computed(() => !!token.value)

  async function login(user: string, password: string) {
    const { data } = await http.post<{ token: string }>('/auth/login', { username: user, password })
    token.value = data.token
    username.value = user
    localStorage.setItem('token', data.token)
    localStorage.setItem('username', user)
  }

  function logout() {
    token.value = null
    username.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    router.push({ name: 'login' })
  }

  return { token, username, isAuthenticated, login, logout }
})
