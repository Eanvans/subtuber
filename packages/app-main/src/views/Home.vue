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
            <div class="empty-icon">📺</div>
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
        alert('请先登录后使用');
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
        alert(e.message || '添加主播失败，请稍后重试');
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
  font-size: 4rem;
  margin-bottom: 1rem;
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
