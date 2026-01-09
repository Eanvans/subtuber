<template>
  <router-link 
    :to="{ name: 'streamer-detail', params: { streamer_id: streamerId } }" 
    class="streamer-card" 
    v-if="statusChecked"
  >
    <!-- 缩略图区域 -->
    <div class="card-thumbnail">
      <img
        v-if="thumbnail"
        :src="thumbnail"
        alt="thumb"
        class="thumb-image"
      />
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
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            {{ formatViewerCount(viewerCount) }}
          </span>
          <span v-for="p in platforms" :key="p" class="platform-tag">
            <svg v-if="pDisplay(p) === 'Twitch'" class="platform-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2" y="3" width="16" height="14" rx="2" ry="2" fill="#6441A5" />
              <path d="M6 19v2h3v-2" fill="#6441A5" />
              <path d="M9 7h2v3H9zM13 7h2v3h-2z" fill="#fff" />
            </svg>
            {{ pDisplay(p) }}
          </span>
        </div>
        
        <a
          v-if="isLive && liveUrl"
          :href="liveUrl"
          target="_blank"
          class="watch-btn"
          @click.stop.prevent="openLiveStream"
        >
          观看
        </a>
      </div>
    </div>
  </router-link>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

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

    let intervalId = null

    const pDisplay = (p) => {
      if (!p) return "未知平台"
      const key = p.toLowerCase()
      if (key.includes("twitch")) return "Twitch"
      if (key.includes("youtube")) return "YouTube"
      return p
    }

    const formatViewerCount = (count) => {
      if (!count) return '0'
      if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K'
      }
      return count.toString()
    }

    const openLiveStream = (event) => {
      // 阻止事件冒泡，避免触发 router-link 的跳转
      event.stopPropagation()
      window.open(liveUrl.value, '_blank')
    }

    const formatThumbnailUrl = (url, width = 440, height = 248) => {
      if (!url) return ""
      return url.replace("{width}", width).replace("{height}", height)
    }

    const checkLive = async () => {
      try {
        loadingStatus.value = true
        const data = await props.checkStatusFn(props.streamerId)
        isLive.value = !!data.is_live
        platforms.value = data.platforms || ["Twitch"]
        streamTitle.value = data.stream_data?.title || ""
        viewerCount.value = data.stream_data?.viewer_count || data.viewers || null
        thumbnail.value = formatThumbnailUrl(data.stream_data?.thumbnail_url || "")
        liveUrl.value = data.url || data.stream_url || `https://www.twitch.tv/${props.streamerId}`
      } catch (e) {
        console.error(`checkLive error for ${props.streamerName}:`, e)
      } finally {
        statusChecked.value = true
        loadingStatus.value = false
      }
    }

    onMounted(() => {
      checkLive()
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
      pDisplay,
      formatViewerCount
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
  0%, 100% {
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
