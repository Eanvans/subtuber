<template>
  <div class="market-page">
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
            主播广场
          </h2>
          <p class="subtitle">浏览和订阅支持的主播，如果长时间没有人订阅的主播将会被移除以节约资源</p>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <p>加载中...</p>
        </div>

        <!-- 主播列表 -->
        <div v-else class="streamer-section">
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
            :show-subscribe-button="true"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { getStreamers, getStreamingStatus, subscribeStreamer } from "../api/streamers";
import StreamerCard from "../components/StreamerCard.vue";
import { useAuth } from "../composables/useAuth";
import { showNotification } from "../utils/notification";

export default {
  components: {
    StreamerCard,
  },
  setup() {
    const { currentUser } = useAuth();
    const loading = ref(false);
    const showAddModal = ref(false);

    // 所有支持的主播列表
    const streamers = ref([]);

    // 获取所有支持的主播
    const fetchStreamers = async () => {
      loading.value = true;
      try {
        const data = await getStreamers();
        streamers.value = data || [];
      } catch (e) {
        console.error('获取主播列表失败:', e);
        streamers.value = [];
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      fetchStreamers();
    });

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
      getStreamingStatus,
      showAddModal,
      handleAddStreamer,
      handleAddStreamerClick,
    };
  },
};
</script>

<style scoped>
.market-page {
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

.streamer-section {
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
