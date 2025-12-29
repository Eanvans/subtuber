import axios from 'axios'
import { getToken } from 'shared-auth'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器：从 shared-auth 获取 token 并放入 header
apiClient.interceptors.request.use(
  config => {
    const token = getToken()
    if (token) {
      config.headers = config.headers || {}
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export const api = {
  getTime() {
    return apiClient.get('/time')
  },
  getBenchlist() {
    return apiClient.get('/benchlist')
  },
  getNames() {
    return apiClient.get('/names')
  },
  searchTwitch(query) {
    return apiClient.get('/search/twitch', {
      params: { q: query }
    })
  }
}

export default apiClient
