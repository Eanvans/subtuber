import { ref } from 'vue'
import { getUserPointsWallet } from '../api/streamers'
import { useAuth } from './useAuth'

const wallet = ref(null)
const walletLoading = ref(false)
const walletError = ref('')
const { currentUser } = useAuth()
let walletUser = null
let latestRequest = 0
const pointsFormat = new Intl.NumberFormat('zh-CN')

export function formatPoints(value) {
  return Number.isSafeInteger(value) ? pointsFormat.format(value) : '—'
}

async function refreshWallet() {
  const user = currentUser.value
  const request = ++latestRequest
  if (walletUser !== user) wallet.value = null
  walletUser = user
  walletError.value = ''
  walletLoading.value = Boolean(user)
  if (!user) return

  try {
    const result = await getUserPointsWallet()
    if (request !== latestRequest || currentUser.value !== user) return
    if (!result?.success || !Number.isSafeInteger(result.wallet?.available_points)) {
      throw new Error('获取积分余额失败')
    }
    wallet.value = result.wallet
  } catch (error) {
    if (request !== latestRequest || currentUser.value !== user) return
    wallet.value = null
    walletError.value = error.status === 401 ? '登录已过期，请重新登录。' : '积分余额暂时无法获取。'
  } finally {
    if (request === latestRequest) walletLoading.value = false
  }
}

export function usePointsWallet() {
  return { wallet, walletLoading, walletError, refreshWallet }
}
