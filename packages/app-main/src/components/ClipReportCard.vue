<template>
  <article class="report-card">
    <div class="report-heading">
      <ReportStreamer :name="report.streamer_name" :avatar-url="report.streamer_avatar_url" />
      <div class="report-metadata">
        <span class="platform-label" :data-platform="report.platform">
          <i v-if="report.platform === 'Twitch'" class="bi bi-twitch" aria-hidden="true"></i>
          <i v-else-if="report.platform === 'YouTube'" class="bi bi-youtube" aria-hidden="true"></i>
          {{ report.platform }}
        </span>
        <time v-if="dateLabel" :datetime="report.date">{{ dateLabel }}</time>
      </div>
    </div>
    <p class="report-summary">{{ report.preview_summary }}</p>

    <div class="report-actions">
      <span v-if="report.is_unlocked" class="unlocked"><i class="bi bi-check-circle" aria-hidden="true"></i> 已解锁</span>
      <span v-else class="report-price"><i class="bi bi-coin" aria-hidden="true"></i> {{ report.unlock_price_points === null ? '积分解锁' : `${report.unlock_price_points} 积分` }}</span>
      <button type="button" class="btn btn-outline btn-sm" :aria-label="`查看报告，${report.title}`" @click="$emit('open', report)">
        查看报告 <span aria-hidden="true">→</span>
      </button>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import ReportStreamer from './ReportStreamer.vue'

const props = defineProps({ report: { type: Object, required: true } })
defineEmits(['open'])
const dateFormat = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
const dateLabel = computed(() => {
  const value = props.report.date
  return value && Number.isFinite(Date.parse(value)) ? dateFormat.format(new Date(value)) : ''
})
</script>

<style scoped>
.report-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: .72rem;
  padding: .95rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card);
  transition: border-color .18s, box-shadow .18s;
}

.report-card:hover { border-color: #bfc4ec; box-shadow: var(--shadow-sm); }
.report-heading, .report-actions { display: flex; align-items: center; justify-content: space-between; gap: .45rem; }
.report-metadata { flex-shrink: 0; display: grid; justify-items: end; gap: .22rem; }
.report-heading time { color: var(--muted-2); font-size: .72rem; font-variant-numeric: tabular-nums; }
.report-summary {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
  overflow: hidden;
  white-space: pre-line;
  overflow-wrap: anywhere;
  margin: 0;
  color: var(--muted-2);
  font-size: .82rem;
  line-height: 1.55;
}

.report-actions { margin-top: auto; }
.report-price, .unlocked { font-size: .76rem; font-weight: 650; font-variant-numeric: tabular-nums; }
.report-price { color: var(--muted); }
.unlocked { color: #087661; }
.report-actions button { min-height: 32px; color: var(--accent); white-space: nowrap; }
.report-actions button:hover { border-color: #bfc4ec; background: var(--accent-soft); }
</style>
