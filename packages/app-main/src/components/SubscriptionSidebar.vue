<template>
  <section class="subscription-panel" aria-labelledby="subscriptions-title">
    <header class="subscription-header">
      <h2 id="subscriptions-title" class="workspace-nav-label">我的订阅</h2>
      <button type="button" class="sidebar-add" aria-label="添加订阅" title="添加订阅" @click="$emit('add-click')">
        <span aria-hidden="true">+</span>
      </button>
    </header>

    <div v-if="loading" class="sidebar-empty" role="status">正在读取订阅…</div>
    <div v-else-if="error" class="sidebar-empty">
      <p>订阅读取失败</p>
      <button type="button" @click="$emit('retry')">重试</button>
    </div>
    <div v-else-if="!loggedIn" class="sidebar-empty">
      <i class="bi bi-bookmark" aria-hidden="true"></i>
      <p>登录后查看订阅的主播与回放</p>
      <button type="button" @click="$emit('login')">登录账号 <span aria-hidden="true">→</span></button>
    </div>
    <div v-else-if="!items.length" class="sidebar-empty">
      <i class="bi bi-bookmark" aria-hidden="true"></i>
      <p>还没有订阅主播</p>
      <button type="button" @click="$emit('add-click')">添加订阅 <span aria-hidden="true">→</span></button>
    </div>
    <nav v-else class="workspace-nav subscription-list" aria-label="订阅主播">
      <RouterLink
        v-for="streamer in items"
        :key="streamer.id"
        :to="{ name: 'streamer-detail', params: { streamer_id: streamer.id } }"
        :class="{ selected: String(streamer.id) === activeId }"
        @click="$emit('navigate')"
      >
        <span class="subscription-avatar" aria-hidden="true">
          {{ String(streamer.name || streamer.id || '?').slice(0, 1) }}
          <img v-if="streamer.profile_image_url" :src="streamer.profile_image_url" alt="" loading="lazy" @error="$event.currentTarget.hidden = true" />
        </span>
        <span class="subscription-name">{{ streamer.name || streamer.id }}</span>
      </RouterLink>
    </nav>
  </section>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  activeId: { type: String, default: '' },
  loading: Boolean,
  error: Boolean,
  loggedIn: Boolean
})
defineEmits(['add-click', 'login', 'navigate', 'retry'])
</script>

<style scoped>
.subscription-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-top: 1rem;
  border-top: 1px solid var(--sidebar-border);
}

.subscription-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
  padding-right: .3rem;
  margin-bottom: .55rem;
}

.subscription-header h2 {
  margin-bottom: 0;
}

.sidebar-add {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 7px;
  border: 1px solid var(--sidebar-border);
  background: transparent;
  color: #e2e7fb;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
}

.sidebar-add:hover {
  background: var(--sidebar-hover);
}

.sidebar-empty {
  margin: 0 .2rem;
  padding: .85rem;
  border: 1px solid var(--sidebar-border);
  border-radius: 10px;
  color: var(--sidebar-muted);
  font-size: .78rem;
  line-height: 1.6;
}

.sidebar-empty i {
  color: #a8b6ee;
  font-size: 1rem;
}

.sidebar-empty p {
  margin: .3rem 0 .45rem;
}

.sidebar-empty button {
  border: 0;
  background: none;
  padding: 0;
  color: #c8d1ff;
  cursor: pointer;
}

.sidebar-empty button:hover {
  color: white;
}

.subscription-list {
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
}

.subscription-avatar {
  position: relative;
  flex: 0 0 28px;
  height: 28px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 7px;
  background: #303b66;
  color: #d5deff;
  font-size: .75rem;
  font-weight: 700;
}

.subscription-avatar img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.subscription-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
