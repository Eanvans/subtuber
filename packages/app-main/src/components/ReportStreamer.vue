<template>
  <span class="report-streamer">
    <span class="report-streamer-avatar" aria-hidden="true">
      <span v-if="initial">{{ initial }}</span>
      <i v-else class="bi bi-person"></i>
      <img v-if="avatarUrl" :key="avatarUrl" :src="avatarUrl" alt="" loading="lazy" @error="$event.currentTarget.hidden = true" />
    </span>
    <RouterLink
      v-if="streamerId && name"
      class="report-streamer-name report-streamer-link"
      :to="{ name: 'streamer-detail', params: { streamer_id: streamerId } }"
      :title="name"
    >{{ name }}</RouterLink>
    <span v-else class="report-streamer-name" :title="name || undefined">{{ name || '未知主播' }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, default: '' },
  streamerId: { type: String, default: '' },
  avatarUrl: { type: String, default: '' }
})
const initial = computed(() => Array.from(props.name)[0]?.toUpperCase())
</script>

<style scoped>
.report-streamer {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: .5rem;
  color: var(--text);
  font-size: .86rem;
  font-weight: 650;
}

.report-streamer-avatar {
  position: relative;
  width: var(--report-avatar-size, 30px);
  height: var(--report-avatar-size, 30px);
  flex: 0 0 var(--report-avatar-size, 30px);
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
}

.report-streamer-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.report-streamer-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.report-streamer-link { color: inherit; text-decoration: none; }
.report-streamer-link:hover, .report-streamer-link:focus-visible { color: var(--accent); text-decoration: underline; }
</style>
