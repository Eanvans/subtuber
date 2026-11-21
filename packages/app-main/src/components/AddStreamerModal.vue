<template>
  <dialog
    ref="dialog"
    class="workspace-dialog"
    aria-labelledby="subscribe-title"
    @click.self="closeDialog"
    @cancel="handleCancel"
    @close="$emit('close')"
  >
    <div class="workspace-dialog-content">
      <button
        type="button"
        class="workspace-dialog-close"
        aria-label="关闭添加订阅"
        :disabled="submitting"
        @click="closeDialog"
      >×</button>
      <header class="workspace-dialog-header">
        <h2 id="subscribe-title">添加主播订阅</h2>
        <p>粘贴主播的频道链接，将回放和互动分析加入工作台。</p>
      </header>

      <form novalidate :aria-busy="submitting" @submit.prevent="handleSubmit">
        <div class="workspace-dialog-field">
          <label for="stream-url">频道链接</label>
          <input
            id="stream-url"
            ref="linkInput"
            v-model.trim="streamUrl"
            type="url"
            required
            autofocus
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
            placeholder="https://www.twitch.tv/username"
            :readonly="submitting"
            :aria-invalid="Boolean(linkError)"
            :aria-describedby="linkError ? 'stream-url-error' : 'stream-url-hint'"
            @input="clearErrors"
          />
          <p v-if="linkError" id="stream-url-error" class="link-error" role="alert">{{ linkError }}</p>
          <p v-else id="stream-url-hint" class="link-hint">支持 Twitch 主播主页和 YouTube 频道链接。</p>
        </div>

        <div class="detected-channel" aria-live="polite">
          <template v-if="channel">
            <span class="platform-label" :data-platform="platformLabel">
              <i class="bi" :class="channel.platform === 'twitch' ? 'bi-twitch' : 'bi-youtube'" aria-hidden="true"></i>
              {{ platformLabel }}
            </span>
            <span>{{ channel.streamer_id }}</span>
          </template>
        </div>
        <p v-if="requestError" class="workspace-dialog-error" role="alert">{{ requestError }}</p>

        <footer class="workspace-dialog-actions">
          <button type="button" class="btn btn-outline" :disabled="submitting" @click="closeDialog">取消</button>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? '正在订阅…' : '添加订阅' }}
          </button>
        </footer>
      </form>
    </div>
  </dialog>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { subscribeStreamer } from '../api/streamers'
import { formatPlatformName } from '../utils/platform'

const emit = defineEmits(['close', 'subscribed'])
const dialog = ref(null)
const linkInput = ref(null)
const streamUrl = ref('')
const linkError = ref('')
const requestError = ref('')
const submitting = ref(false)

const twitchHosts = new Set(['twitch.tv', 'www.twitch.tv', 'm.twitch.tv'])
const youtubeHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com'])
const twitchNavigation = new Set(['videos', 'directory', 'clip', 'settings', 'search', 'downloads'])

function parseChannelLink(value) {
  if (!value) return null

  let url
  let path
  try {
    url = new URL(value)
    path = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  } catch {
    return null
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null

  const [first = '', second = ''] = path
  if (twitchHosts.has(url.hostname)) {
    if (!/^[a-z0-9_]+$/i.test(first) || twitchNavigation.has(first.toLowerCase())) return null
    return { platform: 'twitch', streamer_id: first }
  }

  if (!youtubeHosts.has(url.hostname)) return null
  if (first === 'channel') {
    return /^UC[a-z0-9_-]+$/i.test(second) ? { platform: 'youtube', streamer_id: second } : null
  }

  const handle = first.startsWith('@') ? first.slice(1) : ['c', 'user'].includes(first) ? second : ''
  if (!/^[\p{L}\p{M}\p{N}_.·-]+$/u.test(handle)) return null
  return { platform: 'youtube', streamer_id: handle }
}

const channel = computed(() => parseChannelLink(streamUrl.value))
const platformLabel = computed(() => formatPlatformName(channel.value?.platform))

function clearErrors() {
  linkError.value = ''
  requestError.value = ''
}

function closeDialog() {
  if (!submitting.value) dialog.value?.close()
}

function handleCancel(event) {
  if (submitting.value) event.preventDefault()
}

async function handleSubmit() {
  if (submitting.value) return
  clearErrors()

  const streamer = channel.value
  if (!streamer) {
    linkError.value = streamUrl.value ? '请输入 Twitch 主播主页或 YouTube 频道链接。' : '请输入频道链接。'
    linkInput.value?.focus()
    return
  }

  submitting.value = true
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await subscribeStreamer(streamer, { signal: controller.signal })
    if (!response?.success) throw new Error(response?.message || '订阅失败，请稍后重试。')
    dialog.value?.close()
    emit('subscribed')
  } catch (error) {
    requestError.value = controller.signal.aborted
      ? '请求超时。请查看我的订阅，确认是否添加成功。'
      : error.message || '订阅失败，请稍后重试。'
  } finally {
    clearTimeout(timeout)
    submitting.value = false
  }
}

onMounted(() => dialog.value?.showModal())
</script>

<style scoped>
.workspace-dialog-field input[aria-invalid="true"] { border-color: #ba3d41; }
.link-hint, .link-error { margin: 0; font-size: .8rem; line-height: 1.55; }
.link-hint { color: var(--muted-2); }
.link-error { color: #a82632; }

.detected-channel:empty { display: none; }
.detected-channel {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .45rem .6rem;
  margin-top: .75rem;
  padding: .6rem .7rem;
  border-radius: 8px;
  background: var(--bg);
  color: var(--muted);
  font-size: .82rem;
  overflow-wrap: anywhere;
}
</style>
