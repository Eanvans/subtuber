<template>
  <div class="streamer-detail-page">
    <div class="main-content">
      <div class="card" style="max-width: 960px; margin: 0 auto">
        <button class="btn btn-ghost" @click="$router.back()">← 返回</button>
        
        <div class="streamer-header">
          <img v-if="avatarUrl" :src="avatarUrl" alt="avatar" class="streamer-avatar" />
          <div class="streamer-info">
            <h2>{{ streamerName }}</h2>
            <p class="streamer-id">ID: {{ streamerId }}</p>
          </div>
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
import { getStreamerVODs, getAnalysis } from '../api/streamers'
import VODList from '../components/VODList.vue'

export default {
  name: 'StreamerDetail',
  components: {
    VODList
  },
  setup() {
    const route = useRoute()
    const streamerId = route.params.streamer_id
    const loading = ref(true)
    const vods = ref([])
    const analysisMap = ref({})
    const streamerInfo = ref(null)

    // 这里可以从 streamers 配置或 API 获取头像
    const streamerName = computed(() => {
      return streamerInfo.value?.name || streamerId || '主播'
    })

    const avatarUrl = computed(() => {
      return streamerInfo.value?.avatarUrl || streamerInfo.value?.avatar_url || ''
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

    const fetchStreamerVODs = async () => {
      try {
        loading.value = true
        const data = await getStreamerVODs(streamerId)
        
        // 如果返回的数据包含主播信息
        if (data.length > 0 && data[0].streamer_name) {
          streamerInfo.value = {
            name: data[0].streamer_name,
            avatarUrl: data[0].avatar_url || ''
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
    })

    return {
      streamerId,
      streamerName,
      avatarUrl,
      loading,
      vods,
      analysisMap
    }
  }
}
</script>

<style scoped>
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
