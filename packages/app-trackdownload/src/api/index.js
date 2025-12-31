import axios from 'axios'
import { getToken } from 'shared-auth'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

apiClient.interceptors.request.use(
  config => {
    const token = getToken()
    if (token) {
      config.headers = config.headers || {}
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

apiClient.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export const api = {
  getTime() { return apiClient.get('/time') },
  getBenchlist() { return apiClient.get('/benchlist') },
  getNames() { return apiClient.get('/names') },
  searchTwitch(query) { return apiClient.get('/search/twitch', { params: { q: query } }) }
}

export default apiClient
