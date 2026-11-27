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
      <div class="streamer-subscription">
        <button
          type="button"
          class="btn"
          :class="isSubscribed ? 'btn-outline subscribed-button' : 'btn-primary'"
          :disabled="subscriptionDisabled"
          @click="subscribeToStreamer"
        >
          <i :class="isSubscribed ? 'bi bi-check2' : 'bi bi-bookmark-plus'" aria-hidden="true"></i>
          {{ subscriptionLabel }}
        </button>
        <p v-if="subscribeError" class="subscription-error" role="status">{{ subscribeError }}</p>
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
import { getStreamerVODs, subscribe, subscribeStreamer } from '../api/streamers'
import VODList from '../components/VODList.vue'
import { useAuth } from '../composables/useAuth'

const props = defineProps({
  subscribed: Boolean,
  subscriptionsLoading: Boolean,
  subscriptionsError: Boolean
})
const emit = defineEmits(['request-login', 'subscribed', 'retry-subscriptions'])
const pageSize = 20
const route = useRoute()
const { currentUser } = useAuth()
const streamerId = computed(() => String(route.params.streamer_id || ''))
const streamerProfile = ref(null)
const streamerInfo = ref(null)
const streamerName = computed(() => streamerProfile.value?.name || streamerInfo.value?.streamer_name || streamerInfo.value?.name || streamerId.value || '主播')
const avatarUrl = computed(() => streamerProfile.value?.profile_image_url || streamerInfo.value?.avatar_url || '')
const vods = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(true)
const error = ref('')
const subscribing = ref(false)
const subscribedHere = ref(false)
const subscribeError = ref('')
const isSubscribed = computed(() => Boolean(currentUser.value) && (props.subscribed || subscribedHere.value))
const vodPlatform = computed(() => vods.value
  .map(vod => String(vod.platform || '').toLowerCase())
  .find(platform => platform === 'twitch' || platform === 'youtube'))
const canSubscribe = computed(() => Boolean(streamerProfile.value?.id || vodPlatform.value))
const subscriptionDisabled = computed(() => Boolean(currentUser.value && (
  isSubscribed.value || subscribing.value || props.subscriptionsLoading ||
  (!props.subscriptionsError && !canSubscribe.value)
)))
const subscriptionLabel = computed(() => {
  if (isSubscribed.value) return '已订阅'
  if (!currentUser.value) return '登录后订阅'
  if (subscribing.value) return '正在订阅…'
  if (props.subscriptionsLoading || (loading.value && !canSubscribe.value)) return '正在读取…'
  if (props.subscriptionsError) return '重试订阅状态'
  return canSubscribe.value ? '订阅主播' : '暂无订阅信息'
})
let offset = 0
let requestVersion = 0
let subscriptionRequest = 0

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
    if (reset) streamerProfile.value = result.streamer

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

async function subscribeToStreamer() {
  const user = currentUser.value
  if (!user) {
    emit('request-login')
    return
  }
  if (subscriptionDisabled.value) return
  if (props.subscriptionsError) {
    emit('retry-subscriptions')
    return
  }

  const version = ++subscriptionRequest
  subscribing.value = true
  subscribeError.value = ''
  try {
    const result = streamerProfile.value?.id
      ? await subscribe(streamerProfile.value.id)
      : await subscribeStreamer({ streamer_id: streamerId.value, platform: vodPlatform.value })
    if (!result?.success) throw new Error(result?.message || '订阅失败，请重试。')
    if (version === subscriptionRequest) subscribedHere.value = true
    if (currentUser.value === user) emit('subscribed')
  } catch (cause) {
    if (version !== subscriptionRequest) return
    subscribeError.value = cause.message || '订阅失败，请重试。'
    if (cause.status === 401) emit('request-login')
  } finally {
    if (version === subscriptionRequest) subscribing.value = false
  }
}

watch([streamerId, currentUser], () => {
  subscriptionRequest += 1
  subscribing.value = false
  subscribedHere.value = false
  subscribeError.value = ''
}, { flush: 'sync' })

watch(streamerId, () => {
  streamerProfile.value = null
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
.streamer-subscription { flex-shrink: 0; display: grid; justify-items: end; gap: .35rem; }
.streamer-subscription .subscribed-button { color: #087661; opacity: 1; cursor: default; }
.streamer-subscription .subscription-error { max-width: 22rem; margin: 0; color: #a13027; font-size: .8rem; text-align: right; }
.vod-panel-header { display: flex; justify-content: space-between; align-items: center; gap: .7rem; padding: 1.15rem 1.25rem; }
.vod-panel-header h2 { margin: 0; font-size: 1.2rem; }
.vod-panel-header p { margin: .35rem 0 0; color: var(--muted-2); font-size: .83rem; }
.vod-count { flex-shrink: 0; color: var(--muted-2); font-size: .78rem; }
.vod-state { padding: 3.25rem 1rem; border-top: 1px solid var(--border); text-align: center; color: var(--muted-2); font-size: .86rem; }
.vod-state p { margin: 0 0 .65rem; }
.history-actions { padding: .9rem 1rem; text-align: center; color: var(--muted-2); font-size: .8rem; }
.history-actions p { margin: 0 0 .6rem; }

@media (max-width: 510px) {
  .streamer-subscription { justify-items: start; }
  .streamer-subscription .subscription-error { text-align: left; }
}
</style>
