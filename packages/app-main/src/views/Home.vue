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
            <p class="subtitle">自动获取lumi近期直播中的高光时刻以及ai分析高光内容</p>
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
            <AddStreamerCard @click="showAddModal = true" />
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
import { getStreamers, getTwitchStatus, getAnalysis } from "../api/streamers";
import StreamerCard from "../components/StreamerCard.vue";
import VODList from "../components/VODList.vue";
import AddStreamerCard from "../components/AddStreamerCard.vue";
import AddStreamerModal from "../components/AddStreamerModal.vue";

export default {
  components: {
    StreamerCard,
    VODList,
    AddStreamerCard,
    AddStreamerModal
  },
  setup() {
    const searchQuery = ref("");
    const loading = ref(false);
    const results = ref([]);
    const error = ref("");
    const showAddModal = ref(false);

    // Streamers list - 从 localStorage 加载或使用默认值
    const loadStreamers = () => {
      try {
        const saved = localStorage.getItem('subscribedStreamers');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error('加载主播列表失败:', e);
      }
      // 默认主播列表
      return [
        {
          id: 'kanekolumi',
          name: 'kanekolumi',
          avatarUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/7ef8599e-5252-43b4-a4fa-baff1a73e78c-profile_image-70x70.png'
        }
      ];
    };

    const streamers = ref(loadStreamers());

    // per-vod analysis cache
    const analysisMap = ref({});

    const fetchStreamers = async () => {
    
  
    };

    const loadAnalysis = async (vod) => {
      if (!vod || !vod.video_id) return;
      const vid = vod.video_id;
      if (analysisMap.value[vid]) return;
      
      try {
        const data = await getAnalysis(vid);
        const series = (data && data.time_series_data) ? data.time_series_data : [];
        analysisMap.value = { ...analysisMap.value, [vid]: series };
      } catch (e) {
        console.error('loadAnalysis error', e);
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

    const subscribe = () => alert("订阅功能开发中");

    const handleAddStreamer = (streamerData) => {
      // 检查是否已存在
      const exists = streamers.value.some(s => s.id === streamerData.id);
      if (exists) {
        alert(`主播 "${streamerData.name}" 已在订阅列表中`);
        return;
      }

      // 添加到列表
      streamers.value.push({
        id: streamerData.id,
        name: streamerData.name,
        avatarUrl: streamerData.avatarUrl || 'https://via.placeholder.com/70',
        platform: streamerData.platform
      });

      // 保存到 localStorage
      try {
        localStorage.setItem('subscribedStreamers', JSON.stringify(streamers.value));
      } catch (e) {
        console.error('保存主播列表失败:', e);
      }

      showAddModal.value = false;
      alert(`成功添加主播 "${streamerData.name}"！`);
    };

    return {
      searchQuery,
      loading,
      results,
      error,
      handleSearch,
      subscribe,
      streamers,
      analysisMap,
      getTwitchStatus,
      showAddModal,
      handleAddStreamer,
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
