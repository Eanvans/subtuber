<template>
  <div class="streamer-detail-page">
    <!-- 通知 Banner -->
    <transition name="slide-down">
      <div v-if="showNotification" class="notification-banner">
        <span>{{ notificationMessage }}</span>
        <button @click="showNotification = false" class="notification-close">×</button>
      </div>
    </transition>
    
    <div class="main-content">
      <div class="card" style="max-width: 960px; margin: 0 auto">
        <button class="btn btn-ghost" @click="$router.back()">← 返回</button>
        
        <div class="streamer-header">
          <img v-if="avatarUrl" :src="avatarUrl" alt="avatar" class="streamer-avatar" />
          <div class="streamer-info">
            <h2>{{ streamerName }}</h2>
            <p class="streamer-id">ID: {{ streamerId }}</p>
          </div>
          <button 
            class="btn-subscribe" 
            :class="{ 'subscribed': isSubscribed }"
            @click="toggleSubscription"
            @mouseenter="isHovering = true"
            @mouseleave="isHovering = false"
            :disabled="subscriptionLoading"
          >
            {{ getButtonText }}
          </button>
        </div>

        <VODList
          :vods="vods"
          :analysis-map="analysisMap"
          :title="`${streamerName} 的直播回放`"
        />

        <div v-if="loading" class="loading-state">加载中...</div>
        <div v-else-if="!vods.length" class="empty-state">
          暂无直播回放记录
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getStreamerVODs, getAnalysis, checkSubscription, subscribe, unsubscribe } from '../api/streamers'
import { useAuth } from '../composables/useAuth'
import VODList from '../components/VODList.vue'

export default {
  name: 'StreamerDetail',
  components: {
    VODList
  },
  setup() {
    const route = useRoute()
    const { currentUser } = useAuth()
    const streamerId = route.params.streamer_id
    const loading = ref(true)
    const vods = ref([])
    const analysisMap = ref({})
    const streamerInfo = ref(null)
    const isSubscribed = ref(false)
    const subscriptionLoading = ref(false)
    const isHovering = ref(false)
    const showNotification = ref(false)
    const notificationMessage = ref('')

    // 显示通知的辅助函数
    const showNotificationWithMessage = (message) => {
      notificationMessage.value = message
      showNotification.value = true
      setTimeout(() => {
        showNotification.value = false
      }, 3000)
    }

    // 这里可以从 streamers 配置或 API 获取头像
    const streamerName = computed(() => {
      return streamerInfo.value?.name || streamerId || '主播'
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
      // 如果没有登录，不调用检查订阅 API
      if (!currentUser.value) return
      
      try {
        isSubscribed.value = await checkSubscription(streamerId)
      } catch (e) {
        console.error('checkSubscription error', e)
      }
    }

    const toggleSubscription = async () => {
      // 检查是否登录
      if (!currentUser.value) {
        showNotificationWithMessage('请先登录后再进行订阅操作')
        return
      }
      
      try {
        subscriptionLoading.value = true
        if (isSubscribed.value) {
          await unsubscribe(streamerId)
          isSubscribed.value = false
        } else {
          await subscribe(streamerId)
          isSubscribed.value = true
        }
      } catch (e) {
        console.error('toggleSubscription error', e)
        showNotificationWithMessage('订阅操作失败，请稍后重试')
      } finally {
        subscriptionLoading.value = false
      }
    }

    const fetchStreamerVODs = async () => {
      try {
        loading.value = true
        const data = await getStreamerVODs(streamerId)
        
        // 如果返回的数据包含主播信息
        if (data.length > 0 && data[0].streamer_name) {
          streamerInfo.value = {
            name: data[0].streamer_name,
            profile_image_url: data[0].avatar_url || ''
          }
        }
        
        vods.value = data.map((vod) => ({
          id: vod.id || vod.video_id,
          title: vod.title || '未命名',
          platform: vod.platform || 'twitch',
          video_id: vod.video_id,
          duration: vod.duration || vod.duration_seconds || '',
          created_at: vod.created_at || null
        }))
      } catch (e) {
        console.error('fetchStreamerVODs error', e)
        vods.value = []
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      fetchStreamerVODs()
      checkSubscriptionStatus()
    })

    return {
      streamerId,
      streamerName,
      avatarUrl,
      loading,
      vods,
      analysisMap,
      isSubscribed,
      subscriptionLoading,
      isHovering,
      toggleSubscription,
      getButtonText,
      showNotification,
      notificationMessage
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
  padding: 1rem;
  min-height: 100vh;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
}

.card {
  background: var(--card, #fff);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

.btn-ghost {
  border: none;
  color: var(--muted, #374151);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 1rem;
}
</style>
