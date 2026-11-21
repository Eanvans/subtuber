import axios from 'axios'
import { getToken } from 'shared-auth'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 600000, // 10分钟
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
    if (error.config?.url?.startsWith('/apikeys')) {
      console.error('API Key request failed', error.response?.status || error.code)
    } else {
      console.error('API Error:', error)
    }
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
  },
  // AI 相关接口
  generateAIContent(data) {
    return apiClient.post('/ai/generate', data)
  },
  getAIProviderInfo() {
    return apiClient.get('/ai/provider')
  },
  summarizeSRT(data) {
    return apiClient.post('/ai/summarize-srt', data)
  },
  summarizeStreamer(streamerId, data = {}) {
    return apiClient.post(`/streamers/${encodeURIComponent(streamerId)}/resummarize`, data)
  },

  // Clip report / billing interfaces
  analyzeClipReport(data = {}) {
    return apiClient.post('/clip-reports/analyze', data)
  },
  getClipReportStatus(reportId) {
    return apiClient.get(`/clip-reports/${encodeURIComponent(reportId)}/status`)
  },
  getClipReportsMarketplace(params = {}) {
    return apiClient.get('/clip-reports/marketplace', { params })
  },
  getClipReportDetail(reportId) {
    return apiClient.get(`/clip-reports/${encodeURIComponent(reportId)}`)
  },
  getClipReportUnlockQuote(reportId, data = {}) {
    return apiClient.post(`/clip-reports/${encodeURIComponent(reportId)}/unlock-quote`, data)
  },
  unlockClipReport(reportId, data = {}) {
    return apiClient.post(`/clip-reports/${encodeURIComponent(reportId)}/unlock`, data)
  },
  getUserPointsWallet() {
    return apiClient.get('/user/points/wallet')
  },
  getUserPointsTransactions(params = {}) {
    return apiClient.get('/user/points/transactions', { params })
  },
  rechargePoints(data = {}) {
    return apiClient.post('/user/points/recharge', data)
  },
  getUserNotifications(params = {}) {
    return apiClient.get('/user/notifications', { params })
  },
  getBillingConfig() {
    return apiClient.get('/admin/billing/config')
  },
  updateBillingConfig(data = {}) {
    return apiClient.put('/admin/billing/config', data)
  },
  getRechargePackages() {
    return apiClient.get('/admin/recharge-packages')
  },
  createOrUpdateRechargePackage(data = {}) {
    return apiClient.post('/admin/recharge-packages', data)
  },
  
  // API Key 管理接口
  createApiKey(data) {
    return apiClient.post('/apikeys', data, { timeout: 15_000 })
  },
  getUserApiKeys(userHash) {
    return apiClient.get(`/apikeys/user/${encodeURIComponent(userHash)}`, { timeout: 15_000 })
  },
  getApiKeysByProvider(userHash, provider) {
    return apiClient.get(`/apikeys/user/${userHash}/provider/${provider}`)
  },
  getApiKeyById(id) {
    return apiClient.get(`/apikeys/${id}`)
  },
  updateApiKey(id, data) {
    return apiClient.put(`/apikeys/${id}`, data, { timeout: 15_000 })
  },
  deleteApiKey(id) {
    return apiClient.delete(`/apikeys/${id}`, { timeout: 15_000 })
  },
  deleteAllUserApiKeys(userHash) {
    return apiClient.delete(`/apikeys/user/${userHash}`)
  },
  getUserProfileWithKeys(userHash) {
    return apiClient.get(`/user/${userHash}/profile`)
  }
}

export default apiClient
