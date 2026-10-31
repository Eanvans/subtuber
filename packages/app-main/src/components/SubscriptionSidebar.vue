<template>
  <aside class="sidebar-panel">
    <div class="sidebar-header">
      <h3>{{ title }}</h3>
      <button v-if="showAddButton" class="btn-add" @click="$emit('add-click')">{{ addButtonText }}</button>
    </div>

    <div v-if="loading" class="sidebar-loading">{{ loadingText }}</div>
    <div v-else-if="!items.length" class="sidebar-empty">{{ emptyText }}</div>
    <nav v-else class="subscription-list" aria-label="我的订阅列表">
      <router-link
        v-for="streamer in items"
        :key="streamer.id"
        :to="{ name: detailRouteName, params: { streamer_id: streamer.id } }"
        class="subscription-item"
        :class="{ active: streamer.id === activeId }"
      >
        <img
          v-if="streamer.profile_image_url"
          :src="streamer.profile_image_url"
          alt="avatar"
          class="subscription-avatar"
        />
        <div v-else class="subscription-avatar placeholder">{{ streamer.name?.slice(0, 1) || '?' }}</div>
        <div class="subscription-meta">
          <div class="subscription-name">{{ streamer.name || streamer.id }}</div>
          <div class="subscription-id">ID: {{ streamer.id }}</div>
        </div>
      </router-link>
    </nav>
  </aside>
</template>

<script>
export default {
  name: 'SubscriptionSidebar',
  props: {
    title: {
      type: String,
      default: '我的订阅'
    },
    items: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    loadingText: {
      type: String,
      default: '加载中...'
    },
    emptyText: {
      type: String,
      default: '暂时还没有订阅主播'
    },
    activeId: {
      type: String,
      default: ''
    },
    showAddButton: {
      type: Boolean,
      default: false
    },
    addButtonText: {
      type: String,
      default: '+ 订阅'
    },
    detailRouteName: {
      type: String,
      default: 'streamer-detail'
    }
  },
  emits: ['add-click']
}
</script>

<style scoped>
.sidebar-panel {
  background: var(--card, #fff);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  height: var(--sidebar-height, 80vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #1f2937;
}

.btn-add {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  color: #374151;
  font-size: 0.85rem;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
}

.btn-add:hover {
  border-color: #3b82f6;
  color: #2563eb;
}

.sidebar-loading,
.sidebar-empty {
  margin-top: 0.8rem;
  color: #6b7280;
  font-size: 0.9rem;
}

.subscription-list {
  margin-top: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  padding-right: 0.25rem;
  flex: 1 1 auto;
}

.subscription-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  border-radius: 8px;
  padding: 0.6rem;
  color: inherit;
  text-decoration: none;
  transition: background 0.15s ease;
}

.subscription-item:hover {
  background: #f3f4f6;
}

.subscription-item.active {
  background: #eff6ff;
  outline: 1px solid #bfdbfe;
}

.subscription-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.subscription-avatar.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  color: #4b5563;
  font-weight: 600;
}

.subscription-meta {
  min-width: 0;
}

.subscription-name {
  font-size: 0.92rem;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subscription-id {
  font-size: 0.78rem;
  color: #6b7280;
}

@media (max-width: 1024px) {
  .sidebar-panel {
    height: auto;
  }

  .subscription-list {
    overflow: visible;
    padding-right: 0;
  }
}
</style>
