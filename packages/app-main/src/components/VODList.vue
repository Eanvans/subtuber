<template>
  <div class="vod-section">
    <h3 class="section-title">{{ title }}</h3>
    <div class="recording-list">
      <router-link
        v-for="v in vods"
        :key="v.id"
        :to="{ name: 'recording', params: { video_id: v.video_id }, query: { platform: v.platform } }"
        class="recording-card"
      >
        <div class="rec-info">
          <div class="rec-header">
            <span class="rec-time-label">直播时间</span>
            <div class="rec-live-time">{{ v.created_at ? formatCreatedAt(v.created_at) : '暂无时间' }}</div>
          </div>
          <div class="rec-title" :title="v.title">{{ v.title }}</div>
          <div class="rec-meta">
            <span class="platform-tag">
              <svg v-if="pDisplay(v.platform) === 'Twitch'" class="platform-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="2" y="3" width="16" height="14" rx="2" ry="2" fill="#6441A5" />
                <path d="M6 19v2h3v-2" fill="#6441A5" />
                <path d="M9 7h2v3H9zM13 7h2v3h-2z" fill="#fff" />
              </svg>
              <svg v-else-if="pDisplay(v.platform) === 'YouTube'" class="platform-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="3" ry="3" fill="#FF0000" />
                <path d="M10 8.5l6 3.5-6 3.5z" fill="#fff" />
              </svg>
              {{ pDisplay(v.platform) }}
            </span>
            <span>·</span>
            <span>时长: {{ v.duration }}</span>
          </div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script>
import { formatPlatformName } from '../utils/platform'
import { formatCreatedAt } from '../utils/dateFormat'

export default {
  name: 'VODList',
  props: {
    vods: {
      type: Array,
      default: () => []
    },
    title: {
      type: String,
      default: ''
    }
  },
  setup() {
    return {
      pDisplay: formatPlatformName,
      formatCreatedAt
    }
  }
}
</script>

<style scoped>
.vod-section {
  margin-top: 2rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--muted, #374151);
  margin-bottom: 1rem;
}

.recording-list {
  display: block;
  gap: 12px;
}

.recording-card {
  width: 100%;
  background: #f8fafc;
  padding: 12px;
  border-radius: 10px;
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
  text-decoration: none;
  color: inherit;
  border: 1px solid #e5e7eb;
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
}

.recording-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  border-color: #cbd5e1;
  cursor: pointer;
}

.rec-title {
  font-weight: 600;
  font-size: 1.05rem;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 0.5rem;
}

.rec-meta {
  color: #777;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.platform-tag {
  display: flex;
  align-items: center;
  gap: 3px;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  color: #6b7280;
}

.platform-icon {
  width: 12px;
  height: 12px;
}

.rec-info {
  width: 100%;
}

.rec-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 0.45rem;
}

.rec-time-label {
  font-size: 0.78rem;
  color: #475569;
  background: #e2e8f0;
  padding: 2px 7px;
  border-radius: 999px;
  font-weight: 600;
}

.rec-live-time {
  font-size: 1.08rem;
  color: #0f172a;
  font-weight: 800;
}
</style>
