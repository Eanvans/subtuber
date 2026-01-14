<template>
  <div class="home-page">
    <main class="main-content">
        <div class="card" style="max-width: 960px; margin: 0 auto">
          <div class="text-left mb-3">
            <h2
              style="
                font-size: 1.5rem;
                margin-bottom: 1rem;
                color: var(--muted);
              "
            >
              我的订阅
            </h2>
            <p class="subtitle">这里显示你订阅的主播，自动获取他们近期直播中的高光时刻</p>
          </div>

          <!-- 加载状态 -->
          <div v-if="loading" class="loading-state">
            <p>加载中...</p>
          </div>

          <!-- 空状态 -->
          <div v-else-if="streamers.length === 0" class="empty-state">
            <div class="empty-icon">
              <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- 背景圆形 -->
                <circle cx="60" cy="60" r="60" fill="url(#gradient1)"/>
                <!-- 电视屏幕 -->
                <rect x="25" y="30" width="70" height="50" rx="4" fill="white" opacity="0.9"/>
                <!-- 屏幕内容（播放符号） -->
                <path d="M50 45 L50 65 L70 55 Z" fill="url(#gradient2)"/>
                <!-- 电视底座 -->
                <rect x="50" y="82" width="20" height="3" rx="1.5" fill="white" opacity="0.8"/>
                <rect x="45" y="85" width="30" height="2" rx="1" fill="white" opacity="0.6"/>
                <!-- 装饰点 -->
                <circle cx="85" cy="25" r="3" fill="white" opacity="0.5"/>
                <circle cx="95" cy="35" r="2" fill="white" opacity="0.5"/>
                <circle cx="25" cy="90" r="2.5" fill="white" opacity="0.5"/>
                
                <defs>
                  <linearGradient id="gradient1" x1="0" y1="0" x2="120" y2="120">
                    <stop offset="0%" stop-color="#667eea"/>
                    <stop offset="100%" stop-color="#764ba2"/>
                  </linearGradient>
                  <linearGradient id="gradient2" x1="50" y1="45" x2="70" y2="65">
                    <stop offset="0%" stop-color="#667eea"/>
                    <stop offset="100%" stop-color="#764ba2"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h3>还没有订阅任何主播</h3>
            <p>去主播广场发现并订阅你喜欢的主播吧！</p>
            <button @click="goToMarket" class="btn-primary">前往主播广场</button>
          </div>

          <!-- 主播列表 -->
          <div v-else class="live-section">
            <StreamerCard
              v-for="streamer in streamers"
              :key="streamer.id"
              :streamer-name="streamer.name"
              :streamer-id="streamer.id"
              :streamer-platforms="streamer.platforms"
              :avatar-url="streamer.profile_image_url"
              :check-status-fn="getStreamingStatus"
              :auto-refresh="true"
              :refresh-interval="30000"
            />
            
            <!-- 添加更多主播提示卡片 -->
            <AddStreamerCard 
              title="订阅更多的主播" 
              description="去主播广场浏览更多可以订阅的主播"
              @click="goToMarket" 
            />
          </div>
        </div>
    </main>

    <!-- 添加主播弹窗 -->
    <AddStreamerModal
      v-if="showAddModal"
      @close="showAddModal = false"
      @submit="handleAddStreamer"
    />
  </div>
  
</template>

<script>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getTwitchStatus, getStreamingStatus, subscribeStreamer } from "../api/streamers";
import StreamerCard from "../components/StreamerCard.vue";
import AddStreamerCard from "../components/AddStreamerCard.vue";
import AddStreamerModal from "../components/AddStreamerModal.vue";
import { useAuth } from "../composables/useAuth";
import { showNotification } from "../utils/notification";

export default {
  components: {
    StreamerCard,
    AddStreamerCard,
    AddStreamerModal
  },
  setup() {
    const router = useRouter();
    const { currentUser } = useAuth();
    const loading = ref(false);
    const showAddModal = ref(false);

    // 用户订阅的主播列表
    const streamers = ref([]);

    // 获取用户订阅的主播列表
    const fetchStreamers = async () => {
      // 如果没有登录，不请求订阅列表
      if (!currentUser.value) {
        streamers.value = [];
        loading.value = false;
        return;
      }
      
      loading.value = true;
      try {
        const response = await fetch('/api/user/subscriptions');
        if (!response.ok) {
          throw new Error('获取订阅列表失败');
        }
        const data = await response.json();
        streamers.value = data?.streamers || [];
      } catch (e) {
        console.error('获取订阅主播列表失败:', e);
        streamers.value = [];
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      fetchStreamers();
    });

    // 前往主播广场
    const goToMarket = () => {
      router.push('/market');
    };

    const handleSearch = async () => {
      // 搜索功能已移除
    };

    const handleAddStreamerClick = () => {
      if (!currentUser.value) {
        showNotification('请先登录后使用');
        return;
      }
      showAddModal.value = true;
    };

    const handleAddStreamer = async (streamerData) => {
      try {
        // 调用 API 添加主播
        await subscribeStreamer(streamerData);
        
        // 重新获取主播列表
        await fetchStreamers();
        
        showAddModal.value = false;
      } catch (e) {
        console.error('添加主播失败:', e);
        showNotification(e.message || '添加主播失败，请稍后重试');
      }
    };

    return {
      loading,
      streamers,
      getTwitchStatus,
      getStreamingStatus,
      showAddModal,
      handleAddStreamer,
      handleAddStreamerClick,
      goToMarket,
    };
  },
};
</script>

<style scoped>
.home-page {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1 1 auto;
  overflow: auto;
}

.card {
  padding-bottom: 1rem;
}

.loading-state {
  text-align: center;
  padding: 2rem;
  color: var(--muted);
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--muted);
}

.empty-icon {
  width: 120px;
  height: 120px;
  margin: 0 auto 1.5rem;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.empty-state h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.empty-state p {
  margin-bottom: 1.5rem;
  color: var(--muted);
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: var(--primary, #6366f1);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: var(--primary-hover, #4f46e5);
}

.result-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  text-decoration: none;
  color: inherit;
}
.login-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.login-card {
  width: 420px;
  max-width: 95%;
  background: var(--card, #fff);
  padding: 1rem;
  border-radius: 8px;
  position: relative;
}
.btn-close {
  position: absolute;
  right: 8px;
  top: 8px;
  border: none;
  background: transparent;
  font-size: 1.25rem;
}

/* Live card styles */
.live-section {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  justify-items: center;
}

.subtitle {
  font-size: 0.95rem;
  color: #6b7280;
  margin-top: 0.25rem;
}
</style>
