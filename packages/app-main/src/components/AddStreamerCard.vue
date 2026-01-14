<template>
  <div class="add-streamer-card" @click="$emit('click')">
    <div class="add-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </div>
    <div class="add-text">
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AddStreamerCard',
  props: {
    title: {
      type: String,
      default: '添加主播'
    },
    description: {
      type: String,
      default: '添加新的需要支持的主播'
    }
  },
  emits: ['click']
}
</script>

<style scoped>
.add-streamer-card {
  width: 280px;
  height: 360px;
  background: var(--card, #fff);
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6b7280;
}

.add-streamer-card:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #f0f9ff;
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(59, 130, 246, 0.15);
}

.add-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.add-streamer-card:hover .add-icon {
  background: #dbeafe;
}

.add-icon svg {
  width: 32px;
  height: 32px;
}

.add-text {
  text-align: center;
}

.add-text h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.add-text p {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  opacity: 0.8;
}
</style>
