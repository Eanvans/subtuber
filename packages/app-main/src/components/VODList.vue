<template>
  <div class="vod-section">
    <h3 class="section-title">{{ title }}</h3>
    <div class="recording-list">
      <router-link
        v-for="v in vods"
        :key="v.id"
        :to="{ name: 'recording', params: { video_id: v.video_id } }"
        class="recording-card"
      >
        <div class="rec-info">
          <div class="rec-header">
            <span class="rec-label">直播标题</span>
            <div class="rec-title" :title="v.title">{{ v.title }}</div>
          </div>
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
            <span v-if="v.created_at">·</span>
            <span v-if="v.created_at">{{ formatCreatedAt(v.created_at) }}</span>
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
      default: '近期直播回放'
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
  background: #fafafa;
  padding: 10px;
  border-radius: 6px;
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
  text-decoration: none;
  color: inherit;
}

.recording-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease;
}

.rec-title {
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.rec-label {
  font-size: 0.78rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 600;
  text-transform: none;
}
</style>
