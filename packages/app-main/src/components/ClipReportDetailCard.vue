<template>
  <article class="clip-detail-card">
    <div class="clip-timing">
      <template v-if="report.locked">
        <span class="clip-locked"><i class="bi bi-lock" aria-hidden="true"></i> 起止时间和得分待解锁</span>
        <button type="button" class="btn btn-outline btn-sm" :disabled="unlockDisabled" @click="$emit('unlock')">
          {{ report.unlock_price_points > 0 ? `解锁片段 · ${report.unlock_price_points} 积分` : '积分解锁片段' }}
        </button>
      </template>
      <template v-else>
        <ul v-if="timeLabels.length" class="clip-windows">
          <li v-for="(label, index) in timeLabels" :key="index">{{ label }}</li>
        </ul>
        <span v-else class="clip-locked">暂无起止时间</span>
        <span v-if="report.comments_score != null" class="clip-score">
          {{ report.highlight_count > 1 ? '最高互动得分' : '互动得分' }} <strong>{{ report.comments_score }}</strong>
        </span>
      </template>
    </div>
    <p class="clip-summary">{{ report.summary || '暂无片段摘要' }}</p>
    <ClipReportComments :report-id="report.id" @request-login="$emit('request-login')" />
  </article>
</template>

<script setup>
import { computed } from 'vue'
import ClipReportComments from './ClipReportComments.vue'

const props = defineProps({
  report: { type: Object, required: true },
  unlockDisabled: Boolean
})

defineEmits(['unlock', 'request-login'])

function formatTime(value) {
  const seconds = Number(value)
  if (value == null || value === '' || !Number.isFinite(seconds) || seconds < 0) return ''
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const parts = hours ? [hours, minutes, Math.floor(seconds % 60)] : [minutes, Math.floor(seconds % 60)]
  return parts.map(part => String(part).padStart(2, '0')).join(':')
}

const timeLabels = computed(() => props.report.windows.map(window => {
  if (window.time) return window.time
  const start = formatTime(window.start_seconds)
  const end = formatTime(window.end_seconds)
  return start && end ? `${start} – ${end}` : start
}).filter(Boolean))
</script>

<style scoped>
.clip-detail-card {
  display: grid;
  min-width: 0;
  gap: .75rem;
  padding: .95rem 1rem;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--card);
}
.clip-timing { display: grid; justify-items: start; gap: .35rem; }
.clip-timing .btn { text-align: left; }
.clip-windows { display: grid; gap: .35rem; margin: 0; padding: 0; list-style: none; color: var(--text); font-size: .88rem; font-variant-numeric: tabular-nums; font-weight: 700; }
.clip-score, .clip-locked { color: var(--muted-2); font-size: .8rem; }
.clip-score { font-variant-numeric: tabular-nums; }
.clip-summary { margin: 0; color: var(--muted); font-size: .85rem; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
