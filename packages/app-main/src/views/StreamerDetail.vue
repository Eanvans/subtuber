<template>
  <div class="streamer-detail-page">
    <transition name="slide-down">
      <div v-if="showNotification" class="notification-banner">
        <span>{{ notificationMessage }}</span>
        <button @click="showNotification = false" class="notification-close">×</button>
      </div>
    </transition>

    <div class="detail-layout">
      <SubscriptionSidebar
        title="我的订阅"
        :items="subscriptions"
        :loading="subscriptionsLoading"
        empty-text="暂时还没有订阅主播"
        :active-id="streamerId"
        :show-add-button="true"
        @add-click="openStartExploreModal"
      />

      <section class="content-panel">
        <div class="streamer-header">
          <img v-if="avatarUrl" :src="avatarUrl" alt="avatar" class="streamer-avatar" />
          <div class="streamer-info">
            <h2>{{ streamerName }}</h2>
            <p class="streamer-id">ID: {{ streamerId }}</p>
          </div>
          <button
            class="btn-subscribe"
            :class="{ subscribed: isSubscribed }"
            @click="toggleSubscription"
            @mouseenter="isHovering = true"
            @mouseleave="isHovering = false"
            :disabled="subscriptionLoading"
          >
            {{ getButtonText }}
          </button>
        </div>

        <VODList :vods="vods" :analysis-map="analysisMap" :title="`${streamerName} 的直播回放`" />

        <div v-if="loading" class="loading-state">加载中...</div>
        <div v-else-if="!vods.length" class="empty-state">暂无直播回放记录</div>

        <div v-if="!loading && vods.length" class="history-actions">
          <button
            v-if="hasMoreVods"
            class="btn-load-more"
            :disabled="loadingMore"
            @click="loadMoreHistory"
          >
            {{ loadingMore ? '加载中...' : '获取更多历史' }}
          </button>
          <p v-else class="history-end">已加载全部历史数据</p>
        </div>
      </section>
    </div>

    <StartExploreModal
      v-if="showStartExploreModal"
      @close="showStartExploreModal = false"
      @add-streamer="handleAddStreamer"
    />
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getStreamerVODs, getAnalysis, checkSubscription, subscribe, unsubscribe, subscribeStreamer } from '../api/streamers'
import { useAuth } from '../composables/useAuth'
import VODList from '../components/VODList.vue'
import StartExploreModal from '../components/StartExploreModal.vue'
import SubscriptionSidebar from '../components/SubscriptionSidebar.vue'

const HISTORY_PAGE_SIZE = 20

export default {
  name: 'StreamerDetail',
  components: {
    VODList,
    StartExploreModal,
    SubscriptionSidebar
  },
  setup() {
    const route = useRoute()
    const { currentUser } = useAuth()
    const streamerId = computed(() => String(route.params.streamer_id || ''))

    const loading = ref(true)
    const loadingMore = ref(false)
    const hasMoreVods = ref(true)
    const vodOffset = ref(0)
    const vods = ref([])
    const analysisMap = ref({})
    const streamerInfo = ref(null)
    const isSubscribed = ref(false)
    const subscriptionLoading = ref(false)
    const isHovering = ref(false)
    const showNotification = ref(false)
    const notificationMessage = ref('')
    const subscriptions = ref([])
    const subscriptionsLoading = ref(false)
    const showStartExploreModal = ref(false)

    const showNotificationWithMessage = (message) => {
      notificationMessage.value = message
      showNotification.value = true
      setTimeout(() => {
        showNotification.value = false
      }, 3000)
    }

    const streamerName = computed(() => {
      return streamerInfo.value?.name || streamerId.value || '主播'
    })

    const avatarUrl = computed(() => {
      return streamerInfo.value?.profile_image_url || streamerInfo.value?.avatar_url || ''
    })

    const getButtonText = computed(() => {
      if (subscriptionLoading.value) return '处理中...'
      if (isSubscribed.value && isHovering.value) return '取消订阅'
      if (isSubscribed.value) return '已订阅'
      return '订阅'
    })

    const fetchSubscriptions = async () => {
      if (!currentUser.value) {
        subscriptions.value = []
        subscriptionsLoading.value = false
        return
      }

      subscriptionsLoading.value = true
      try {
        const response = await fetch('/api/user/subscriptions')
        if (!response.ok) {
          throw new Error('获取订阅列表失败')
        }
        const data = await response.json()
        subscriptions.value = data?.streamers || []
      } catch (e) {
        console.error('获取订阅主播列表失败:', e)
        subscriptions.value = []
      } finally {
        subscriptionsLoading.value = false
      }
    }

    const loadAnalysis = async (vod) => {
      if (!vod || !vod.video_id) return
      const vid = vod.video_id
      if (analysisMap.value[vid]) return

      try {
        const data = await getAnalysis(vid)
        const series = (data && data.time_series_data) ? data.time_series_data : []
        analysisMap.value = { ...analysisMap.value, [vid]: series }
      } catch (e) {
        console.error('loadAnalysis error', e)
      }
    }

    const checkSubscriptionStatus = async () => {
      if (!currentUser.value || !streamerId.value) {
        isSubscribed.value = false
        return
      }

      try {
        isSubscribed.value = await checkSubscription(streamerId.value)
      } catch (e) {
        console.error('checkSubscription error', e)
      }
    }

    const mapVodToView = (vod) => ({
      id: vod.id || vod.video_id,
      title: vod.title || '未命名',
      platform: vod.platform || 'twitch',
      video_id: vod.video_id,
      duration: vod.duration || vod.duration_seconds || '',
      created_at: vod.created_at || null
    })

    const fetchStreamerVODs = async ({ reset = false } = {}) => {
      if (!streamerId.value) return

      if (reset) {
        loading.value = true
        vodOffset.value = 0
        hasMoreVods.value = true
        vods.value = []
        analysisMap.value = {}
      } else {
        if (!hasMoreVods.value || loadingMore.value) return
        loadingMore.value = true
      }

      try {
        const result = await getStreamerVODs(streamerId.value, {
          limit: HISTORY_PAGE_SIZE,
          offset: vodOffset.value
        })
        const nextBatch = (result.vods || []).map(mapVodToView)

        let appendedCount = 0
        if (nextBatch.length > 0) {
          if (reset) {
            vods.value = nextBatch
            appendedCount = nextBatch.length
          } else {
            const existing = new Set(vods.value.map((v) => v.video_id))
            const merged = nextBatch.filter((v) => !existing.has(v.video_id))
            vods.value = [...vods.value, ...merged]
            appendedCount = merged.length
          }
        }

        if (nextBatch.length > 0) {
          const first = result.vods?.[0]
          if (first?.streamer_name) {
            streamerInfo.value = {
              name: first.streamer_name,
              profile_image_url: first.avatar_url || ''
            }
          }
        }

        if (typeof result.nextOffset === 'number') {
          vodOffset.value = result.nextOffset
        } else {
          vodOffset.value += nextBatch.length
        }

        if (typeof result.hasMore === 'boolean') {
          hasMoreVods.value = result.hasMore
        } else {
          hasMoreVods.value = nextBatch.length >= HISTORY_PAGE_SIZE
        }

        if (!reset && appendedCount === 0) {
          hasMoreVods.value = false
        }
      } catch (e) {
        console.error('fetchStreamerVODs error', e)
        if (reset) {
          vods.value = []
          hasMoreVods.value = false
        }
      } finally {
        loading.value = false
        loadingMore.value = false
      }
    }

    const toggleSubscription = async () => {
      if (!currentUser.value) {
        showNotificationWithMessage('请先登录后再进行订阅操作')
        return
      }

      try {
        subscriptionLoading.value = true
        if (isSubscribed.value) {
          await unsubscribe(streamerId.value)
          isSubscribed.value = false
          subscriptions.value = subscriptions.value.filter((s) => s.id !== streamerId.value)
        } else {
          await subscribe(streamerId.value)
          isSubscribed.value = true
          const exists = subscriptions.value.some((s) => s.id === streamerId.value)
          if (!exists) {
            subscriptions.value = [
              {
                id: streamerId.value,
                name: streamerName.value,
                profile_image_url: avatarUrl.value,
                platforms: []
              },
              ...subscriptions.value
            ]
          }
        }
      } catch (e) {
        console.error('toggleSubscription error', e)
        showNotificationWithMessage('订阅操作失败，请稍后重试')
      } finally {
        subscriptionLoading.value = false
      }
    }

    const loadMoreHistory = async () => {
      await fetchStreamerVODs({ reset: false })
    }

    const handleLoginSuccess = async () => {
      await Promise.all([
        fetchSubscriptions(),
        checkSubscriptionStatus()
      ])
    }

    const openStartExploreModal = () => {
      if (!currentUser.value) {
        showNotificationWithMessage('请先登录后使用')
        return
      }
      showStartExploreModal.value = true
    }

    const handleAddStreamer = async (streamerData) => {
      try {
        await subscribeStreamer(streamerData)
        await fetchSubscriptions()
        showStartExploreModal.value = false
      } catch (e) {
        console.error('添加主播失败:', e)
        showNotificationWithMessage(e.message || '添加主播失败，请稍后重试')
      }
    }

    watch(streamerId, async () => {
      streamerInfo.value = null
      await Promise.all([
        fetchStreamerVODs({ reset: true }),
        checkSubscriptionStatus()
      ])
    }, { immediate: true })

    onMounted(() => {
      fetchSubscriptions()
      window.addEventListener('login-success', handleLoginSuccess)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('login-success', handleLoginSuccess)
    })

    return {
      streamerId,
      streamerName,
      avatarUrl,
      loading,
      loadingMore,
      hasMoreVods,
      vods,
      analysisMap,
      isSubscribed,
      subscriptionLoading,
      isHovering,
      toggleSubscription,
      getButtonText,
      loadAnalysis,
      loadMoreHistory,
      showNotification,
      notificationMessage,
      subscriptions,
      subscriptionsLoading,
      showStartExploreModal,
      openStartExploreModal,
      handleAddStreamer
    }
  }
}
</script>

<style scoped>
.notification-banner {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 1000;
  min-width: 300px;
  max-width: 500px;
}

.notification-close {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.notification-close:hover {
  opacity: 1;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.streamer-detail-page {
  --sidebar-width: 280px;
  --sidebar-top: 92px;
  --panel-height: 80vh;
  --sidebar-height: var(--panel-height);
  padding: 1rem;
  overflow: hidden;
}

.detail-layout {
  max-width: 1300px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  gap: 1rem;
}

.content-panel {
  background: var(--card, #fff);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.content-panel {
  padding: 1.5rem;
  height: var(--panel-height);
  overflow-y: auto;
}

.streamer-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.streamer-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #f3f4f6;
}

.streamer-info {
  flex: 1;
}

.streamer-info h2 {
  margin: 0;
  font-size: 1.75rem;
  color: #1f2937;
}

.streamer-id {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: #6b7280;
}

.btn-subscribe {
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid #3b82f6;
  background: #3b82f6;
  color: white;
}

.btn-subscribe:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-subscribe.subscribed {
  background: white;
  color: #3b82f6;
}

.btn-subscribe.subscribed:hover:not(:disabled) {
  background: #fee2e2;
  border-color: #ef4444;
  color: #ef4444;
}

.btn-subscribe:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.history-actions {
  margin-top: 1rem;
  text-align: center;
}

.btn-load-more {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.6rem 1rem;
  background: #fff;
  color: #1f2937;
  font-size: 0.92rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-load-more:hover:not(:disabled) {
  border-color: #3b82f6;
  color: #2563eb;
}

.btn-load-more:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.history-end {
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0;
}

.btn-ghost {
  border: none;
  color: var(--muted, #374151);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 1rem;
}

@media (max-width: 1024px) {
  .streamer-detail-page {
    --panel-height: auto;
    --sidebar-height: auto;
    overflow: visible;
  }

  .detail-layout {
    grid-template-columns: 1fr;
  }

  .content-panel {
    height: auto;
    overflow: visible;
  }
}
</style>
