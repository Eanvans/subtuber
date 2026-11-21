<template>
  <article class="report-card">
    <div class="report-heading">
      <span class="platform-label" :data-platform="report.platform">
        <i v-if="report.platform === 'Twitch'" class="bi bi-twitch" aria-hidden="true"></i>
        <i v-else-if="report.platform === 'YouTube'" class="bi bi-youtube" aria-hidden="true"></i>
        {{ report.platform }}
      </span>
      <time v-if="dateLabel" :datetime="report.date">{{ dateLabel }}</time>
    </div>
    <h3 :title="report.title">{{ report.title }}</h3>
    <p class="report-summary">{{ report.preview_summary }}</p>

    <div class="report-preview">
      <div class="report-preview-heading">
        <span><i class="bi bi-activity" aria-hidden="true"></i> 高能片段</span>
        <span>{{ report.highlights.length }} 个</span>
      </div>
      <ul v-if="report.highlights.length">
        <li v-for="item in report.highlights.slice(0, 2)" :key="item.id">
          <span class="preview-dot" aria-hidden="true"></span><span :title="item.label">{{ item.label }}</span>
        </li>
      </ul>
      <p v-else>暂无片段数据</p>
    </div>

    <div class="report-actions">
      <span v-if="report.is_unlocked" class="unlocked"><i class="bi bi-check-circle" aria-hidden="true"></i> 已解锁</span>
      <span v-else class="report-price"><i class="bi bi-coin" aria-hidden="true"></i> {{ report.unlock_cost }} 积分</span>
      <button type="button" class="btn btn-outline btn-sm" :aria-label="`查看报告，${report.title}`" @click="$emit('open', report)">
        查看报告 <span aria-hidden="true">→</span>
      </button>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

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
.report-heading, .report-actions, .report-preview-heading { display: flex; align-items: center; justify-content: space-between; gap: .45rem; }
.report-heading time { color: var(--muted-2); font-size: .72rem; font-variant-numeric: tabular-nums; }
.report-card h3 { margin: 0; color: var(--text); font-size: .98rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.report-summary {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  min-height: 2.6em;
  overflow: hidden;
  overflow-wrap: anywhere;
  margin: 0;
  color: var(--muted-2);
  font-size: .82rem;
  line-height: 1.55;
}

.report-preview { min-height: 84px; padding: .55rem .65rem; border-radius: 7px; background: #f5f6fb; }
.report-preview-heading { color: var(--muted); font-size: .74rem; font-weight: 690; }
.report-preview-heading i { margin-right: .18rem; color: var(--accent); }
.report-preview-heading > span:last-child { color: var(--accent); font-variant-numeric: tabular-nums; white-space: nowrap; }
.report-preview ul { display: grid; gap: .25rem; list-style: none; padding: 0; margin: .35rem 0 0; }
.report-preview li { min-width: 0; display: flex; align-items: center; gap: .45rem; color: var(--muted); font-size: .76rem; }
.report-preview li span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.preview-dot { width: 5px; height: 5px; flex: 0 0 5px; border-radius: 50%; background: #898dea; }
.report-preview p { margin: .4rem 0 0; color: var(--muted-2); font-size: .76rem; }
.report-actions { margin-top: auto; }
.report-price, .unlocked { font-size: .76rem; font-weight: 650; font-variant-numeric: tabular-nums; }
.report-price { color: var(--muted); }
.unlocked { color: #087661; }
.report-actions button { min-height: 32px; color: var(--accent); white-space: nowrap; }
.report-actions button:hover { border-color: #bfc4ec; background: var(--accent-soft); }
</style>
