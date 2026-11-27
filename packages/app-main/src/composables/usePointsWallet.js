import { ref } from 'vue'
import { claimDailyLoginReward, getUserPointsWallet } from '../api/streamers'
import { useAuth } from './useAuth'

const wallet = ref(null)
const walletLoading = ref(false)
const walletError = ref('')
const dailyRewardStatus = ref('')
const { currentUser } = useAuth()
let walletUser = null
let latestRequest = 0
const pointsFormat = new Intl.NumberFormat('zh-CN')
const rewardDateFormat = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', dateStyle: 'short' })
let rewardCheck

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

async function checkDailyReward() {
  const user = currentUser.value
  if (!user) {
    rewardCheck = null
    dailyRewardStatus.value = ''
    return 0
  }

  const day = rewardDateFormat.format(new Date())
  if (rewardCheck?.user === user && rewardCheck.day === day) return 0
  const check = { user, day }
  rewardCheck = check
  dailyRewardStatus.value = ''
  try {
    const result = await claimDailyLoginReward()
    if (rewardCheck !== check || currentUser.value !== user) return 0
    if (!result?.success || !Number.isSafeInteger(result.daily_points) || result.daily_points < 0) {
      throw new Error('无效的每日积分响应')
    }
    dailyRewardStatus.value = 'claimed'
    void refreshWallet()
    return result.daily_points
  } catch (error) {
    if (rewardCheck === check && currentUser.value === user) {
      if (error.status === 401) {
        dailyRewardStatus.value = 'verify'
      } else {
        dailyRewardStatus.value = 'error'
        rewardCheck = null
      }
    }
    return 0
  }
}

export function usePointsWallet() {
  return { wallet, walletLoading, walletError, refreshWallet, dailyRewardStatus, checkDailyReward }
}
