<template>
  <main class="workspace-width workspace-page">
    <header class="page-header">
      <div class="streamer-identity">
        <div class="streamer-avatar" aria-hidden="true">
          {{ streamerName.slice(0, 1) }}
          <img v-if="avatarUrl" :key="avatarUrl" :src="avatarUrl" alt="" @error="$event.currentTarget.hidden = true" />
        </div>
        <div>
          <h1>{{ streamerName }}</h1>
          <p>直播回放记录与互动分析</p>
        </div>
      </div>
    </header>

    <section class="surface vod-panel" aria-labelledby="vod-heading">
      <header class="vod-panel-header">
        <div>
          <h2 id="vod-heading">直播回放</h2>
          <p>选择一场直播，查看热度走势和高能片段。</p>
        </div>
        <span v-if="vods.length" class="vod-count">已加载 {{ vods.length }} 场</span>
      </header>
      <div v-if="loading" class="vod-state" role="status">正在加载直播回放…</div>
      <div v-else-if="error && !vods.length" class="vod-state" role="status">
        <p>{{ error }}</p>
        <button type="button" class="btn btn-outline btn-sm" @click="fetchVods(true)">重新加载</button>
      </div>
      <div v-else-if="!vods.length" class="vod-state">暂无直播回放记录</div>
      <template v-else>
        <VODList :vods="vods" :streamer-id="streamerId" />
        <footer class="history-actions">
          <p v-if="error" role="status">{{ error }}</p>
          <button v-if="hasMore" type="button" class="btn btn-outline btn-sm" :disabled="loadingMore" @click="fetchVods(false)">
            {{ loadingMore ? '正在加载…' : '加载更多回放' }}
          </button>
          <span v-else>已加载全部历史回放</span>
        </footer>
      </template>
    </section>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getStreamerVODs } from '../api/streamers'
import VODList from '../components/VODList.vue'

const pageSize = 20
const route = useRoute()
const streamerId = computed(() => String(route.params.streamer_id || ''))
const streamerInfo = ref(null)
const streamerName = computed(() => streamerInfo.value?.streamer_name || streamerId.value || '主播')
const avatarUrl = computed(() => streamerInfo.value?.avatar_url || '')
const vods = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(true)
const error = ref('')
let offset = 0
let requestVersion = 0

async function fetchVods(reset) {
  if (!streamerId.value || (!reset && (!hasMore.value || loadingMore.value))) return

  const version = ++requestVersion
  error.value = ''
  if (reset) {
    loading.value = true
    loadingMore.value = false
    vods.value = []
    hasMore.value = true
    offset = 0
  } else {
    loadingMore.value = true
  }

  try {
    const result = await getStreamerVODs(streamerId.value, { limit: pageSize, offset })
    if (requestVersion !== version) return

    const knownIds = new Set(vods.value.map(vod => vod.video_id))
    const entries = result.vods.filter(vod => {
      if (!vod.video_id || knownIds.has(vod.video_id)) return false
      knownIds.add(vod.video_id)
      return true
    })
    if (!streamerInfo.value && result.vods.length) streamerInfo.value = result.vods[0]
    vods.value.push(...entries)
    const nextOffset = result.nextOffset ?? offset + result.vods.length
    hasMore.value = Boolean(entries.length && nextOffset > offset && (result.hasMore ?? result.vods.length >= pageSize))
    offset = nextOffset
  } catch (cause) {
    if (requestVersion !== version) return
    console.error('获取直播回放失败', cause)
    error.value = '直播回放加载失败，请重试。'
  } finally {
    if (requestVersion === version) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

watch(streamerId, () => {
  streamerInfo.value = null
  void fetchVods(true)
}, { immediate: true })
</script>

<style scoped>
.streamer-identity { min-width: 0; display: flex; align-items: center; gap: .95rem; }
.streamer-avatar {
  position: relative;
  flex: 0 0 56px;
  height: 56px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 1.3rem;
  font-weight: 750;
}

.streamer-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.vod-panel-header { display: flex; justify-content: space-between; align-items: center; gap: .7rem; padding: 1.15rem 1.25rem; }
.vod-panel-header h2 { margin: 0; font-size: 1.2rem; }
.vod-panel-header p { margin: .35rem 0 0; color: var(--muted-2); font-size: .83rem; }
.vod-count { flex-shrink: 0; color: var(--muted-2); font-size: .78rem; }
.vod-state { padding: 3.25rem 1rem; border-top: 1px solid var(--border); text-align: center; color: var(--muted-2); font-size: .86rem; }
.vod-state p { margin: 0 0 .65rem; }
.history-actions { padding: .9rem 1rem; text-align: center; color: var(--muted-2); font-size: .8rem; }
.history-actions p { margin: 0 0 .6rem; }
</style>
