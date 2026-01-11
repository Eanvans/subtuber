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
              订阅你喜欢的主播
            </h2>
            <p class="subtitle">自动获取主播近期直播中的高光时刻以及ai分析高光内容</p>
          </div>

          <!-- Streamers live cards -->
          <div class="live-section">
            <StreamerCard
              v-for="streamer in streamers"
              :key="streamer.id"
              :streamer-name="streamer.name"
              :streamer-id="streamer.id"
              :avatar-url="streamer.avatarUrl"
              :check-status-fn="getTwitchStatus"
              :auto-refresh="true"
              :refresh-interval="30000"
            />
            <AddStreamerCard @click="handleAddStreamerClick" />
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
import { ref, onMounted, nextTick, onBeforeUnmount } from "vue";
import { api } from "../api";
import { getStreamers, getTwitchStatus, getAnalysis, subscribeStreamer } from "../api/streamers";
import StreamerCard from "../components/StreamerCard.vue";
import VODList from "../components/VODList.vue";
import AddStreamerCard from "../components/AddStreamerCard.vue";
import AddStreamerModal from "../components/AddStreamerModal.vue";
import { useAuth } from "../composables/useAuth";

export default {
  components: {
    StreamerCard,
    VODList,
    AddStreamerCard,
    AddStreamerModal
  },
  setup() {
    const { currentUser } = useAuth();
    const searchQuery = ref("");
    const loading = ref(false);
    const results = ref([]);
    const error = ref("");
    const showAddModal = ref(false);

    // Streamers list - 从 API 获取
    const streamers = ref([]);

    // per-vod analysis cache
    const analysisMap = ref({});

    const fetchStreamers = async () => {
      try {
        const data = await getStreamers();
        streamers.value = data || [];
      } catch (e) {
        console.error('获取主播列表失败:', e);
        streamers.value = [];
      }
    };

    onMounted(() => {
      fetchStreamers();
    });

    onBeforeUnmount(() => {
    });

    const handleSearch = async () => {
      if (!searchQuery.value.trim()) return;
      loading.value = true;
      try {
        const data = await api.searchTwitch(searchQuery.value);
        results.value = data;
      } catch (e) {
        error.value = "搜索失败";
      } finally {
        loading.value = false;
      }
    };

    const handleAddStreamerClick = () => {
      if (!currentUser.value) {
        alert('防止过度的添加，请先登录后使用');
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
      searchQuery,
      loading,
      results,
      error,
      handleSearch,
      streamers,
      analysisMap,
      getTwitchStatus,
      showAddModal,
      handleAddStreamer,
      handleAddStreamerClick,
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
