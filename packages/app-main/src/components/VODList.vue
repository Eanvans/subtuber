<template>
  <div class="vod-list">
    <div class="vod-row vod-labels" aria-hidden="true">
      <span>直播标题</span><span>平台</span><span>直播时间</span><span>时长</span><span></span>
    </div>
    <RouterLink
      v-for="vod in vods"
      :key="vod.video_id"
      :to="{ name: 'recording', params: { video_id: vod.video_id }, query: { platform: vod.platform || 'twitch', streamer_id: streamerId }, state: { recordingTitle: vod.title || '' } }"
      class="vod-row vod-link"
    >
      <span class="vod-title">{{ vod.title || '未命名直播' }}</span>
      <span class="platform-label" :data-platform="formatPlatformName(vod.platform || 'twitch')">{{ formatPlatformName(vod.platform || 'twitch') }}</span>
      <time v-if="vod.created_at" :datetime="vod.created_at">{{ formatCreatedAt(vod.created_at) }}</time>
      <span v-else>—</span>
      <span class="vod-duration">{{ formatDuration(vod.duration || vod.duration_seconds) }}</span>
      <span class="vod-arrow" aria-hidden="true">→</span>
    </RouterLink>
  </div>
</template>

<script setup>
import { formatPlatformName } from '../utils/platform'
import { formatCreatedAt } from '../utils/dateFormat'

defineProps({
  vods: { type: Array, required: true },
  streamerId: { type: String, required: true }
})

function formatDuration(duration) {
  if (!duration) return '—'
  const text = String(duration).trim()
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(text)
  const seconds = /^\d+$/.test(text) ? Number(text) : match && (Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0))
  if (!Number.isFinite(seconds)) return text
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds % 3600 / 60)
  const parts = hours ? [hours, minutes, seconds % 60] : [minutes, seconds % 60]
  return parts.map(part => String(part).padStart(2, '0')).join(':')
}
</script>

<style scoped>
.vod-list { border-bottom: 1px solid var(--border); }
.vod-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 5.5rem 10rem 4rem 1rem;
  align-items: center;
  gap: .75rem;
  padding: .85rem 1.25rem;
  border-top: 1px solid var(--border);
  color: var(--muted-2);
  font-size: .79rem;
  text-decoration: none;
}

.vod-labels { background: #fafbfe; font-weight: 650; padding-block: .62rem; }
.vod-link:hover { background: #f6f7ff; }
.vod-link:focus-visible { outline-offset: -2px; }
.vod-title { color: var(--text); font-size: .88rem; font-weight: 650; overflow-wrap: anywhere; }
.vod-duration, time { font-variant-numeric: tabular-nums; }
.vod-arrow { color: var(--accent); font-size: 1rem; }
@media (max-width: 1000px) {
  .vod-labels { display: none; }
  .vod-row { grid-template-columns: max-content max-content minmax(0, 1fr) auto; gap: .35rem .65rem; }
  .vod-title { grid-column: 1 / 4; grid-row: 1; }
  .vod-arrow { grid-column: 4; grid-row: 1 / 3; }
}
@media (max-width: 400px) {
  .vod-row { grid-template-columns: max-content minmax(0, 1fr) auto auto; padding-inline: .8rem; font-size: .72rem; gap: .35rem; }
}
</style>
