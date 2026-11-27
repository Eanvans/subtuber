<template>
  <div class="app-shell">
    <button
      v-if="navigationOpen"
      type="button"
      class="navigation-backdrop"
      aria-label="关闭导航"
      @click="closeNavigation"
    ></button>

    <aside id="workspace-navigation" class="workspace-sidebar" :class="{ 'is-open': navigationOpen }">
      <RouterLink to="/" class="workspace-brand" @click="closeNavigation">
        <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
        <span class="brand-name">SubTuber<small>直播内容分析</small></span>
      </RouterLink>

      <div class="workspace-nav-group">
        <p class="workspace-nav-label">工作台</p>
        <nav class="workspace-nav" aria-label="工作台导航">
          <RouterLink
            to="/"
            :class="{ selected: route.path === '/' && !route.hash }"
            :aria-current="route.path === '/' && !route.hash ? 'page' : false"
            @click="closeNavigation"
          >
            <i class="bi bi-grid-1x2" aria-hidden="true"></i> 数据概览
          </RouterLink>
          <RouterLink
            :to="{ path: '/', hash: '#clip-market' }"
            :class="{ selected: route.hash === '#clip-market' }"
            :aria-current="route.hash === '#clip-market' ? 'location' : false"
            @click="closeNavigation"
          >
            <i class="bi bi-collection-play" aria-hidden="true"></i> 切片市场
          </RouterLink>
        </nav>
      </div>

      <SubscriptionSidebar
        :items="subscriptions"
        :loading="subscriptionsLoading"
        :error="subscriptionsError"
        :logged-in="Boolean(currentUser)"
        :active-id="activeSubscriptionId"
        @add-click="openSubscribe"
        @login="openLogin"
        @retry="fetchSubscriptions"
        @navigate="closeNavigation"
      />

      <div class="workspace-nav workspace-sidebar-footer">
        <RouterLink v-if="currentUser" to="/settings" :class="{ selected: route.path === '/settings' }" @click="closeNavigation">
          <i class="bi bi-gear" aria-hidden="true"></i> 账号设置
        </RouterLink>
        <button v-else type="button" @click="openLogin">
          <i class="bi bi-box-arrow-in-right" aria-hidden="true"></i> 登录账号
        </button>
      </div>
    </aside>

    <div class="workspace-main">
      <header class="workspace-topbar">
        <div class="topbar-inner">
          <div class="topbar-location">
            <button
              ref="navigationToggle"
              class="btn btn-outline navigation-toggle"
              type="button"
              aria-label="打开导航"
              aria-controls="workspace-navigation"
              :aria-expanded="navigationOpen"
              @click="navigationOpen = !navigationOpen"
            >
              <i class="bi bi-list" aria-hidden="true"></i><span>菜单</span>
            </button>
            <nav class="breadcrumb" aria-label="当前位置">
              <RouterLink to="/">工作台</RouterLink>
              <span class="breadcrumb-divider" aria-hidden="true">/</span>
              <RouterLink
                v-if="route.name === 'recording' && activeSubscriptionId"
                :to="{ name: 'streamer-detail', params: { streamer_id: activeSubscriptionId } }"
                class="breadcrumb-parent"
              >直播回放</RouterLink>
              <span v-if="route.name === 'recording' && activeSubscriptionId" class="breadcrumb-divider breadcrumb-parent" aria-hidden="true">/</span>
              <span aria-current="page">{{ pageLabel }}</span>
            </nav>
          </div>

          <div class="topbar-account">
            <div class="topbar-wallet">
              <span v-if="currentUser" class="topbar-points" aria-live="polite" :title="walletError || undefined">
                <i class="bi bi-coin" aria-hidden="true"></i>
                <span v-if="wallet"><strong>{{ formatPoints(wallet.available_points) }}</strong> 积分</span>
                <span v-else>{{ walletLoading ? '读取积分…' : '积分暂不可用' }}</span>
              </span>
              <RouterLink :to="{ name: 'recharge' }" class="btn btn-outline btn-sm" aria-label="获取积分">获取</RouterLink>
            </div>
            <RouterLink v-if="currentUser" to="/settings" class="account-button" :aria-label="accountLabel + '的账号设置'">
              <span class="account-avatar" aria-hidden="true">{{ accountLabel.slice(0, 1).toUpperCase() }}</span>
              <span class="account-name">{{ accountLabel }}</span>
              <i class="bi bi-chevron-down" aria-hidden="true"></i>
            </RouterLink>
            <button v-else type="button" class="btn btn-primary btn-sm" @click="openLogin">登录</button>
          </div>
        </div>
      </header>

      <RouterView v-slot="{ Component }">
        <component
          :is="Component"
          v-if="route.path === '/'"
          @request-login="openLogin"
          @request-subscribe="openSubscribe"
        />
        <component
          :is="Component"
          v-else
          :key="route.name === 'recording' ? route.fullPath : route.name"
          v-bind="route.name === 'streamer-detail' ? { subscribed: activeStreamerSubscribed, subscriptionsLoading, subscriptionsError } : {}"
          @request-login="openLogin"
          @subscribed="handleSubscriptionAdded"
          @retry-subscriptions="fetchSubscriptions"
        />
      </RouterView>

      <footer class="workspace-footer">
        <div class="workspace-width footer-inner">
          <span>© {{ currentYear }} SubTuber</span>
          <nav aria-label="关于 SubTuber">
            <a href="https://github.com/Eanvans/subtuber" target="_blank" rel="noopener noreferrer">GitHub</a>
            <RouterLink to="/privacy">隐私</RouterLink>
            <RouterLink to="/terms">条款</RouterLink>
            <details class="feedback">
              <summary>交流与反馈</summary>
              <div class="feedback-popover">
                <img src="../images/qq.png" alt="开发交流 QQ 群二维码" width="128" height="128" />
                <span>开发交流 QQ 群</span>
                <span>已支持 Twitch、YouTube</span>
              </div>
            </details>
          </nav>
        </div>
      </footer>
    </div>

    <Transition name="slide-down">
      <div v-if="notificationMessage" class="workspace-notification" role="status">
        <span>{{ notificationMessage }}</span>
        <button type="button" aria-label="关闭通知" @click="notificationMessage = ''">×</button>
      </div>
    </Transition>

    <dialog ref="loginDialog" class="workspace-dialog" aria-labelledby="workspace-login-title" @click.self="loginDialog.close()" @close="loginForm?.clearCode()">
      <button type="button" class="workspace-dialog-close" aria-label="关闭登录" @click="loginDialog.close()">×</button>
      <Login v-if="loginOpened" ref="loginForm" title-id="workspace-login-title" @verified="onVerified" />
    </dialog>

    <AddStreamerModal
      v-if="showSubscribe"
      @close="showSubscribe = false"
      @subscribed="handleSubscriptionAdded"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Login from '../../shared-auth/Login.vue'
import AddStreamerModal from './components/AddStreamerModal.vue'
import SubscriptionSidebar from './components/SubscriptionSidebar.vue'
import { useAuth } from './composables/useAuth'
import { formatPoints, usePointsWallet } from './composables/usePointsWallet'
import { showNotification } from './utils/notification'

const route = useRoute()
const { currentUser, setUser } = useAuth()
const { wallet, walletLoading, walletError, refreshWallet, checkDailyReward } = usePointsWallet()
const currentYear = new Date().getFullYear()
const navigationOpen = ref(false)
const navigationToggle = ref(null)
const loginOpened = ref(false)
const loginDialog = ref(null)
const loginForm = ref(null)
const showSubscribe = ref(false)
const subscriptions = ref([])
const subscriptionsLoading = ref(false)
const subscriptionsError = ref(false)
const notificationMessage = ref('')
let subscriptionsRequest = 0
let notificationTimeout
let subscribeAfterLogin = false

const pageLabels = {
  settings: '账号设置',
  recharge: '获取积分',
  privacy: '隐私政策',
  terms: '服务条款',
  'streamer-detail': '直播回放',
  recording: '回放分析'
}
const pageLabel = computed(() => pageLabels[route.name] || (route.hash === '#clip-market' ? '切片市场' : '数据概览'))
const accountLabel = computed(() => currentUser.value?.displayName || currentUser.value?.email || '我的账号')
const activeSubscriptionId = computed(() => String(route.params.streamer_id || route.query.streamer_id || ''))
const activeStreamerSubscribed = computed(() => subscriptions.value.some(
  streamer => String(streamer.id).toLowerCase() === activeSubscriptionId.value.toLowerCase()
))

function closeNavigation() {
  if (!navigationOpen.value) return
  navigationOpen.value = false
  if (navigationToggle.value?.offsetWidth) navigationToggle.value.focus()
}

async function openLogin(forSubscription = false) {
  closeNavigation()
  subscribeAfterLogin = forSubscription === true
  loginOpened.value = true
  await nextTick()
  if (loginDialog.value?.open) return
  loginDialog.value?.showModal()
  loginForm.value?.focusEmail()
}

function openSubscribe() {
  closeNavigation()
  if (currentUser.value) {
    showSubscribe.value = true
  } else {
    void openLogin(true)
  }
}

async function fetchSubscriptions() {
  const request = ++subscriptionsRequest
  const user = currentUser.value
  subscriptionsError.value = false
  subscriptionsLoading.value = Boolean(user)
  if (!user) return

  try {
    const response = await fetch('/api/user/subscriptions', { cache: 'no-store' })
    if (!response.ok) throw new Error('获取订阅列表失败')
    const data = await response.json()
    if (request === subscriptionsRequest) subscriptions.value = data?.streamers || []
  } catch (error) {
    if (request === subscriptionsRequest) subscriptionsError.value = true
    console.error('获取订阅列表失败', error)
  } finally {
    if (request === subscriptionsRequest) subscriptionsLoading.value = false
  }
}

function handleSubscriptionAdded() {
  showNotification('订阅已添加')
  void fetchSubscriptions()
}

function onVerified(result) {
  if (!result?.user) return

  loginDialog.value?.close()
  setUser(result.user)
  const awarded = [result.reward_award?.welcome_points, result.reward_award?.daily_points]
    .filter(points => Number.isSafeInteger(points) && points > 0)
    .reduce((total, points) => total + points, 0)
  showNotification(awarded ? `登录成功，已到账 ${formatPoints(awarded)} 积分` : '登录成功')
  window.dispatchEvent(new CustomEvent('login-success', { detail: { user: result.user } }))
  if (subscribeAfterLogin) showSubscribe.value = true
  subscribeAfterLogin = false
}

function handleNotification(event) {
  notificationMessage.value = event.detail.message
  clearTimeout(notificationTimeout)
  notificationTimeout = setTimeout(() => { notificationMessage.value = '' }, 3000)
}

function handleEscape(event) {
  if (event.key === 'Escape' && !loginDialog.value?.open) closeNavigation()
}

async function syncDailyReward() {
  if (document.visibilityState !== 'visible') return
  const points = await checkDailyReward()
  if (points > 0) showNotification(`每日登录奖励已到账 +${formatPoints(points)} 积分`)
}

watch(currentUser, () => {
  subscriptions.value = []
  void fetchSubscriptions()
  void refreshWallet()
  void syncDailyReward()
}, { immediate: true })
watch(() => route.fullPath, closeNavigation)

onMounted(() => {
  window.addEventListener('show-notification', handleNotification)
  window.addEventListener('keydown', handleEscape)
  window.addEventListener('focus', syncDailyReward)
  document.addEventListener('visibilitychange', syncDailyReward)
})
onBeforeUnmount(() => {
  window.removeEventListener('show-notification', handleNotification)
  window.removeEventListener('keydown', handleEscape)
  window.removeEventListener('focus', syncDailyReward)
  document.removeEventListener('visibilitychange', syncDailyReward)
  clearTimeout(notificationTimeout)
})
</script>
