<template>
  <div class="home-page">
    <main class="main-content">
      <div class="home-layout">
        <SubscriptionSidebar
          title="我的订阅"
          :items="streamers"
          :loading="loading"
          empty-text="还没有订阅主播"
          :show-add-button="true"
          @add-click="showStartExploreModal = true"
        />

        <section class="content-panel">
          <div class="text-left mb-3">
            <h2 class="page-title">SubTuber 使用说明</h2>
            <p class="subtitle">首页模板：3 步快速开始，先订阅主播，再查看回放热点，最后持续优化你的订阅列表。</p>
          </div>

          <section class="guide-section">
            <article class="guide-card">
              <div class="guide-media">
                <svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="8" y="8" width="104" height="74" rx="10" fill="#EEF2FF" />
                  <circle cx="34" cy="45" r="14" fill="#C7D2FE" />
                  <rect x="56" y="30" width="38" height="8" rx="4" fill="#818CF8" />
                  <rect x="56" y="45" width="30" height="7" rx="3.5" fill="#A5B4FC" />
                  <rect x="56" y="57" width="24" height="7" rx="3.5" fill="#C7D2FE" />
                </svg>
              </div>
              <div class="guide-content">
                <h3>1. 添加订阅主播</h3>
                <p>点击左侧「+ 订阅」，输入主播信息，建立你的专属订阅列表。</p>
              </div>
            </article>

            <article class="guide-card">
              <div class="guide-media">
                <svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="8" y="8" width="104" height="74" rx="10" fill="#ECFDF5" />
                  <polyline points="22,60 38,45 52,52 70,30 92,42" fill="none" stroke="#10B981" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
                  <circle cx="92" cy="42" r="5" fill="#059669" />
                </svg>
              </div>
              <div class="guide-content">
                <h3>2. 查看直播热点</h3>
                <p>进入主播详情页，系统会展示回放与热点时段，帮助你快速回顾精彩内容。</p>
              </div>
            </article>

            <article class="guide-card">
              <div class="guide-media">
                <svg viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="8" y="8" width="104" height="74" rx="10" fill="#FEF3C7" />
                  <rect x="24" y="26" width="72" height="8" rx="4" fill="#F59E0B" />
                  <rect x="24" y="42" width="60" height="8" rx="4" fill="#FCD34D" />
                  <rect x="24" y="58" width="48" height="8" rx="4" fill="#FDE68A" />
                </svg>
              </div>
              <div class="guide-content">
                <h3>3. 持续优化列表</h3>
                <p>根据观看偏好增减订阅，保持列表精简，让首页始终聚焦你最关心的主播。</p>
              </div>
            </article>
          </section>
        </section>
      </div>
    </main>

    <StartExploreModal
      v-if="showStartExploreModal"
      @close="showStartExploreModal = false"
      @add-streamer="handleAddStreamer"
    />
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { subscribeStreamer } from '../api/streamers'
import StartExploreModal from '../components/StartExploreModal.vue'
import SubscriptionSidebar from '../components/SubscriptionSidebar.vue'
import { useAuth } from '../composables/useAuth'
import { showNotification } from '../utils/notification'

export default {
  components: {
    StartExploreModal,
    SubscriptionSidebar
  },
  setup() {
    const { currentUser } = useAuth()
    const loading = ref(false)
    const showStartExploreModal = ref(false)
    const streamers = ref([])

    const fetchStreamers = async () => {
      if (!currentUser.value) {
        streamers.value = []
        loading.value = false
        return
      }

      loading.value = true
      try {
        const response = await fetch('/api/user/subscriptions')
        if (!response.ok) {
          throw new Error('获取订阅列表失败')
        }
        const data = await response.json()
        streamers.value = data?.streamers || []
      } catch (e) {
        console.error('获取订阅主播列表失败:', e)
        streamers.value = []
      } finally {
        loading.value = false
      }
    }

    const handleLoginSuccess = () => {
      fetchStreamers()
    }

    onMounted(() => {
      fetchStreamers()
      window.addEventListener('login-success', handleLoginSuccess)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('login-success', handleLoginSuccess)
    })

    const handleAddStreamer = async (streamerData) => {
      try {
        await subscribeStreamer(streamerData)
        await fetchStreamers()
      } catch (e) {
        console.error('添加主播失败:', e)
        showNotification(e.message || '添加主播失败，请稍后重试')
      }
    }

    return {
      loading,
      streamers,
      showStartExploreModal,
      handleAddStreamer
    }
  }
}
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1 1 auto;
  overflow: hidden;
  padding: 1rem;
}

.home-layout {
  --sidebar-width: 280px;
  --sidebar-top: 92px;
  --panel-height: 80vh;
  --sidebar-height: var(--panel-height);
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

.page-title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--muted, #374151);
}

.subtitle {
  font-size: 0.95rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.guide-section {
  margin-top: 1.25rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.guide-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  background: #fff;
}

.guide-media {
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  background: #f9fafb;
}

.guide-media svg {
  display: block;
  width: 100%;
  height: auto;
}

.guide-content h3 {
  margin: 0.85rem 0 0.4rem;
  font-size: 1.05rem;
  color: #111827;
}

.guide-content p {
  margin: 0;
  font-size: 0.9rem;
  color: #4b5563;
  line-height: 1.5;
}

@media (max-width: 1024px) {
  .main-content {
    overflow: auto;
  }

  .home-layout {
    grid-template-columns: 1fr;
    --panel-height: auto;
    --sidebar-height: auto;
  }

  .content-panel {
    height: auto;
    overflow: visible;
  }
}
</style>
