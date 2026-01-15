<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h3>添加订阅主播</h3>
        <button class="close-btn" @click="$emit('close')" aria-label="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label for="stream-url">直播间链接 *</label>
          <textarea
            id="stream-url"
            v-model="formData.streamUrl"
            rows="2"
            placeholder="https://www.twitch.tv/username 或 &#10;https://www.youtube.com/@username"
            class="form-input"
            @keyup.enter="handleSubmit"
          ></textarea>
          <span class="input-hint">输入主播的完整直播间链接，目前支持 Twitch、YouTube 平台</span>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">
          取消
        </button>
        <button 
          class="btn btn-primary" 
          @click="handleSubmit"
          :disabled="!isValid"
        >
          添加主播
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { showNotification } from '../utils/notification'

export default {
  name: 'AddStreamerModal',
  emits: ['close', 'submit'],
  setup(props, { emit }) {
    const formData = ref({
      streamUrl: ''
    })

    const isValid = computed(() => {
      const url = formData.value.streamUrl.trim()
      if (!url) return false
      
      // 简单验证是否包含常见的直播平台域名
      const validPlatforms = ['twitch.tv', 'youtube.com']
      return validPlatforms.some(platform => url.includes(platform))
    })

    const parseStreamUrl = (url) => {
      try {
        const urlObj = new URL(url)
        let platform = 'other'
        let id = ''
        let name = ''

        if (urlObj.hostname.includes('twitch.tv')) {
          platform = 'twitch'
          // https://www.twitch.tv/username
          const pathParts = urlObj.pathname.split('/').filter(Boolean)
          id = pathParts[0] || ''
          name = id
        } else if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
          platform = 'youtube'
          // https://www.youtube.com/@username 或 /channel/xxx
          const pathParts = urlObj.pathname.split('/').filter(Boolean)
          if (pathParts[0] === '@') {
            id = pathParts[1] || pathParts[0]
            name = pathParts[1] || pathParts[0]
          } else {
            id = pathParts[pathParts.length - 1] || ''
            name = id
          }
        }

        return { platform, id, name }
      } catch (e) {
        console.error('URL解析失败:', e)
        return null
      }
    }

    const handleSubmit = () => {
      if (!isValid.value) return
      
      const parsed = parseStreamUrl(formData.value.streamUrl.trim())
      if (!parsed || !parsed.id) {
        showNotification('无法解析直播间链接，请检查链接是否正确')
        return
      }
      
      if (parsed.platform === 'other' || (parsed.platform !== 'twitch' && parsed.platform !== 'youtube')) {
        showNotification('暂时不支持该平台，目前仅支持 Twitch 和 YouTube')
        return
      }
      
      emit('submit', {
        streamer_id: parsed.id,
        platform: parsed.platform
      })
      
      // 重置表单
      formData.value = {
        streamUrl: ''
      }
    }

    return {
      formData,
      isValid,
      handleSubmit
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
  width: 480px;
  max-width: 95%;
  background: var(--card, #fff);
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-input {
  padding: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9375rem;
  line-height: 1.5;
  min-height: 3.5rem;
  color: #1f2937;
  transition: all 0.2s ease;
  background: var(--card, #fff);
  vertical-align: top;
  font-family: inherit;
  resize: none;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input::placeholder {
  color: #9ca3af;
}

.input-hint {
  font-size: 0.8125rem;
  color: #6b7280;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
}
</style>
