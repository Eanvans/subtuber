<template>
  <router-link :to="{ name: 'streamer-detail', params: { streamer_id: streamerId } }" class="streamer-card"
    v-if="statusChecked">
    <!-- 缩略图区域 -->
    <div class="card-thumbnail">
      <img v-if="thumbnail" :src="thumbnail" alt="thumb" class="thumb-image" />
      <div v-else class="thumb-placeholder">
        <span>离线中</span>
      </div>
      <span :class="['live-badge', isLive ? 'live' : 'offline']">
        {{ isLive ? "LIVE" : "OFFLINE" }}
      </span>
    </div>

    <!-- 信息区域 -->
    <div class="card-info">
      <div class="streamer-header">
        <img v-if="avatarUrl" :src="avatarUrl" alt="avatar" class="avatar" />
        <h3 class="streamer-name">{{ streamerName }}</h3>
        <button 
          v-if="showSubscribeButton"
          class="btn-subscribe-mini" 
          :class="{ 'subscribed': isSubscribed }"
          @click.prevent="toggleSubscription"
          @mouseenter="isHovering = true"
          @mouseleave="isHovering = false"
          :disabled="subscriptionLoading"
        >
          {{ getButtonText }}
        </button>
      </div>

      <p class="stream-title" v-if="streamTitle">
        {{ streamTitle }}
      </p>
      <p class="stream-title offline-text" v-else>
        暂未开播
      </p>

      <div class="card-footer">
        <div class="meta-info">
          <span v-if="viewerCount" class="viewer-count">
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
            </svg>
            {{ formatViewerCount(viewerCount) }}
          </span>
          <span v-for="p in streamerPlatforms" :key="p" class="platform-tag">
            <svg v-if="pDisplay(p.platform) === 'Twitch'" class="platform-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2" y="3" width="16" height="14" rx="2" ry="2" fill="#6441A5" />
              <path d="M6 19v2h3v-2" fill="#6441A5" />
              <path d="M9 7h2v3H9zM13 7h2v3h-2z" fill="#fff" />
            </svg>
            <svg v-else-if="pDisplay(p.platform) === 'YouTube'" class="platform-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000"/>
            </svg>
            {{ pDisplay(p.platform) }}
          </span>
        </div>

        <a v-if="isLive && liveUrl" :href="liveUrl" target="_blank" class="watch-btn"
          @click.stop.prevent="openLiveStream">
          观看
        </a>
      </div>
    </div>
  </router-link>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { formatPlatformName, formatViewerCount } from '../utils/platform'
import { checkSubscription, subscribe, unsubscribe } from '../api/streamers'

export default {
  name: 'StreamerCard',
  props: {
    streamerName: {
      type: String,
      required: true
    },
    streamerId: {
      type: String,
      required: true
    },
    streamerPlatforms: {
      type: Array,
      default: () => []
    },
    avatarUrl: {
      type: String,
      default: ''
    },
    checkStatusFn: {
      type: Function,
      required: true
    },
    autoRefresh: {
      type: Boolean,
      default: true
    },
    refreshInterval: {
      type: Number,
      default: 30000
    },
    showSubscribeButton: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const isLive = ref(false)
    const platforms = ref([])
    const streamTitle = ref('')
    const viewerCount = ref(null)
    const thumbnail = ref('')
    const liveUrl = ref('')
    const statusChecked = ref(false)
    const loadingStatus = ref(false)
    const isSubscribed = ref(false)
    const subscriptionLoading = ref(false)
    const isHovering = ref(false)

    let intervalId = null

    const openLiveStream = (event) => {
      // 阻止事件冒泡，避免触发 router-link 的跳转
      event.stopPropagation()
      window.open(liveUrl.value, '_blank')
    }

    const formatThumbnailUrl = (url, width = 440, height = 248) => {
      if (!url) return ""
      return url.replace("{width}", width).replace("{height}", height)
    }

    const getButtonText = computed(() => {
      if (subscriptionLoading.value) return '...'
      if (isSubscribed.value && isHovering.value) return '取消'
      if (isSubscribed.value) return '✓'
      return '+'
    })

    const checkSubscriptionStatus = async () => {
      if (!props.showSubscribeButton) return
      try {
        isSubscribed.value = await checkSubscription(props.streamerId)
      } catch (e) {
        console.error('checkSubscription error', e)
      }
    }

    const toggleSubscription = async () => {
      try {
        subscriptionLoading.value = true
        if (isSubscribed.value) {
          await unsubscribe(props.streamerId)
          isSubscribed.value = false
        } else {
          await subscribe(props.streamerId)
          isSubscribed.value = true
        }
      } catch (e) {
        console.error('toggleSubscription error', e)
        alert('订阅操作失败，请稍后重试')
      } finally {
        subscriptionLoading.value = false
      }
    }

    const checkLive = async () => {
      try {
        loadingStatus.value = true
        const data = await props.checkStatusFn(props.streamerId)
        
        // 使用顶层的 is_live 状态
        isLive.value = !!data.is_live
        
        // 重置状态
        platforms.value = []
        streamTitle.value = ''
        viewerCount.value = null
        thumbnail.value = ''
        liveUrl.value = ''
        
        // 检查 platforms 对象
        if (data.platforms) {
          let livePlatformData = null
          let livePlatformName = ''
          
          // 遍历所有平台
          for (const [platformName, platformData] of Object.entries(data.platforms)) {
            if (platformData.is_live && platformData.stream) {
              // 记录正在直播的平台
              platforms.value.push(platformName)
              
              // 使用第一个直播的平台数据
              if (!livePlatformData) {
                livePlatformData = platformData.stream
                livePlatformName = platformName
              }
            }
          }
          
          // 如果有平台在直播，设置相关信息
          if (livePlatformData && livePlatformData.stream_data) {
            streamTitle.value = livePlatformData.stream_data.title || ""
            viewerCount.value = livePlatformData.stream_data.viewer_count || null
            
            // 处理缩略图 URL
            const thumbUrl = livePlatformData.stream_data.thumbnail_url || ""
            if (thumbUrl.includes('{width}') && thumbUrl.includes('{height}')) {
              // Twitch 格式的缩略图
              thumbnail.value = formatThumbnailUrl(thumbUrl)
            } else {
              // YouTube 或其他平台的缩略图
              thumbnail.value = thumbUrl
            }
            
            // 根据平台设置直播链接
            if (livePlatformName === 'youtube' && livePlatformData.stream_data.id) {
              liveUrl.value = `https://www.youtube.com/watch?v=${livePlatformData.stream_data.id}`
            } else if (livePlatformName === 'twitch') {
              liveUrl.value = `https://www.twitch.tv/${props.streamerId}`
            } else {
              liveUrl.value = `https://www.twitch.tv/${props.streamerId}`
            }
          }
          
          // 如果没有平台在直播，记录所有平台
          if (platforms.value.length === 0) {
            platforms.value = Object.keys(data.platforms)
          }
        }
      } catch (e) {
        console.error(`checkLive error for ${props.streamerName}:`, e)
      } finally {
        statusChecked.value = true
        loadingStatus.value = false
      }
    }

    onMounted(() => {
      checkLive()
      checkSubscriptionStatus()
      if (props.autoRefresh) {
        intervalId = setInterval(checkLive, props.refreshInterval)
      }
    })

    onBeforeUnmount(() => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    })

    // 监听 streamerId 变化，重新检查状态
    watch(() => props.streamerId, () => {
      statusChecked.value = false
      checkLive()
    })

    return {
      isLive,
      platforms,
      streamTitle,
      viewerCount,
      openLiveStream,
      thumbnail,
      liveUrl,
      statusChecked,
      loadingStatus,
      pDisplay: formatPlatformName,
      formatViewerCount,
      isSubscribed,
      subscriptionLoading,
      isHovering,
      toggleSubscription,
      getButtonText
    }
  }
}
</script>

<style scoped>
.streamer-card {
  width: 280px;
  background: var(--card, #fff);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
}

.streamer-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

/* 缩略图区域 */
.card-thumbnail {
  position: relative;
  width: 100%;
  height: 160px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
}

.thumb-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
}

.live-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.live-badge.live {
  background: #ff4d4f;
  color: #fff;
  animation: pulse 2s ease-in-out infinite;
}

.live-badge.offline {
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.8;
  }
}

/* 信息区域 */
.card-info {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.streamer-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #f0f0f0;
}

.streamer-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.btn-subscribe-mini {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1.5px solid #3b82f6;
  background: #3b82f6;
  color: white;
  min-width: 32px;
  flex-shrink: 0;
}

.btn-subscribe-mini:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-subscribe-mini.subscribed {
  background: white;
  color: #3b82f6;
}

.btn-subscribe-mini.subscribed:hover:not(:disabled) {
  background: #fee2e2;
  border-color: #ef4444;
  color: #ef4444;
}

.btn-subscribe-mini:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.stream-title {
  margin: 0;
  font-size: 0.85rem;
  color: #4b5563;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  min-height: 2.4em;
}

.offline-text {
  color: #9ca3af;
  font-style: italic;
}

/* 底部区域 */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid #f3f4f6;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: #6b7280;
}

.viewer-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon {
  width: 14px;
  height: 14px;
}

.platform-tag {
  display: flex;
  align-items: center;
  gap: 3px;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.platform-icon {
  width: 12px;
  height: 12px;
}

.watch-btn {
  padding: 4px 12px;
  background: #3b82f6;
  color: white;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s ease;
}

.watch-btn:hover {

  .watch-btn:active {
    transform: scale(0.95);
  }

  background: #2563eb;
}
</style>
