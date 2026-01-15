<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h3>开始你的订阅之旅</h3>
        <button class="close-btn" @click="$emit('close')" aria-label="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <p class="subtitle">选择一种方式开始订阅你喜欢的主播</p>
        
        <div class="options-container">
          <!-- 选项一：添加主播 -->
          <div class="option-card" @click="handleAddStreamer">
            <div class="option-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </div>
            <div class="option-content">
              <h4>直接添加主播</h4>
              <p>输入主播的直播间链接，快速添加订阅</p>
            </div>
            <div class="option-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>

          <!-- 选项二：前往广场 -->
          <div class="option-card" @click="handleGoToMarket">
            <div class="option-icon option-icon-secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div class="option-content">
              <h4>前往主播广场</h4>
              <p>浏览其他用户订阅的热门主播</p>
            </div>
            <div class="option-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加主播弹窗 -->
    <AddStreamerModal
      v-if="showAddStreamerModal"
      @close="showAddStreamerModal = false"
      @submit="handleSubmitStreamer"
    />
  </div>
</template>

<script>
import { ref } from 'vue'
import AddStreamerModal from './AddStreamerModal.vue'

export default {
  name: 'StartExploreModal',
  components: {
    AddStreamerModal
  },
  emits: ['close', 'goToMarket', 'addStreamer'],
  setup(props, { emit }) {
    const showAddStreamerModal = ref(false)

    const handleAddStreamer = () => {
      showAddStreamerModal.value = true
    }

    const handleGoToMarket = () => {
      emit('goToMarket')
      emit('close')
    }

    const handleSubmitStreamer = (streamerData) => {
      emit('addStreamer', streamerData)
      showAddStreamerModal.value = false
      emit('close')
    }

    return {
      showAddStreamerModal,
      handleAddStreamer,
      handleGoToMarket,
      handleSubmitStreamer
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-card {
  background: var(--card, #fff);
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border, #e5e7eb);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #111827);
}

.close-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: var(--muted, #6b7280);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--hover, #f3f4f6);
  color: var(--text-primary, #111827);
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  max-height: calc(90vh - 120px);
}

.subtitle {
  margin: 0 0 1.5rem;
  color: var(--muted, #6b7280);
  font-size: 0.95rem;
  text-align: center;
}

.options-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.option-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border: 2px solid var(--border, #e5e7eb);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--card, #fff);
}

.option-card:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.option-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.option-icon-secondary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.option-card:hover .option-icon {
  transform: scale(1.1);
}

.option-icon svg {
  width: 24px;
  height: 24px;
  color: white;
}

.option-content {
  flex: 1;
}

.option-content h4 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #111827);
}

.option-content p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--muted, #6b7280);
}

.option-arrow {
  color: var(--muted, #6b7280);
  transition: all 0.2s ease;
}

.option-card:hover .option-arrow {
  color: #3b82f6;
  transform: translateX(4px);
}

.option-arrow svg {
  width: 20px;
  height: 20px;
}

@media (max-width: 640px) {
  .modal-card {
    width: 95%;
  }

  .option-card {
    padding: 1rem;
  }

  .option-icon {
    width: 40px;
    height: 40px;
  }

  .option-icon svg {
    width: 20px;
    height: 20px;
  }
}
</style>
