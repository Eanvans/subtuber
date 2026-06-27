<template>
  <div class="chatbot-container">
    <div class="chatbot-header">
      <h1>AI 智能助手</h1>
      <div class="provider-info" v-if="providerInfo">
        <span class="provider-badge">{{ providerInfo.provider }}</span>
        <span class="model-badge">{{ providerInfo.model }}</span>
      </div>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <div 
        v-for="(message, index) in messages" 
        :key="index" 
        :class="['message', message.role]"
      >
        <div class="message-avatar">
          <i v-if="message.role === 'user'" class="bi bi-person-circle"></i>
          <i v-else class="bi bi-robot"></i>
        </div>
        <div class="message-content">
          <div class="message-text">{{ message.content }}</div>
          <div class="message-time">{{ message.timestamp }}</div>
        </div>
      </div>

      <div v-if="isLoading" class="message assistant">
        <div class="message-avatar">
          <i class="bi bi-robot"></i>
        </div>
        <div class="message-content">
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>

      <div v-if="messages.length === 0 && !isLoading" class="empty-state">
        <i class="bi bi-chat-dots"></i>
        <h3>开始与AI助手对话</h3>
        <p>发送消息来获得AI的帮助和回答</p>
      </div>
    </div>

    <div class="chat-input-container">
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      <div class="chat-input-wrapper">
        <textarea
          v-model="inputMessage"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact="inputMessage += '\n'"
          placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
          :disabled="isLoading"
          rows="1"
          ref="inputTextarea"
        ></textarea>
        <button 
          @click="sendMessage" 
          :disabled="!inputMessage.trim() || isLoading"
          class="btn btn-send"
        >
          <i class="bi bi-send-fill"></i>
        </button>
      </div>
      <div class="chat-actions">
        <button @click="clearChat" class="btn btn-ghost btn-sm">
          <i class="bi bi-trash"></i> 清空对话
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick, watch } from 'vue'
import { api } from '../api'

export default {
  name: 'ChatBot',
  setup() {
    const messages = ref([])
    const inputMessage = ref('')
    const isLoading = ref(false)
    const error = ref('')
    const messagesContainer = ref(null)
    const inputTextarea = ref(null)
    const providerInfo = ref(null)

    // 格式化时间
    const formatTime = () => {
      const now = new Date()
      return now.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }

    // 自动调整输入框高度
    const adjustTextareaHeight = () => {
      const textarea = inputTextarea.value
      if (textarea) {
        textarea.style.height = 'auto'
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
      }
    }

    watch(inputMessage, () => {
      nextTick(adjustTextareaHeight)
    })

    // 滚动到底部
    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }

    // 发送消息
    const sendMessage = async () => {
      if (!inputMessage.value.trim() || isLoading.value) return

      const userMessage = inputMessage.value.trim()
      
      // 添加用户消息
      messages.value.push({
        role: 'user',
        content: userMessage,
        timestamp: formatTime()
      })

      inputMessage.value = ''
      error.value = ''
      isLoading.value = true
      scrollToBottom()

      try {
        // 调用 AI API
        const response = await api.generateAIContent({
          prompt: userMessage,
          max_output_tokens: 2000
        })

        if (response.success) {
          // 添加 AI 回复
          messages.value.push({
            role: 'assistant',
            content: response.content,
            timestamp: formatTime()
          })
        } else {
          throw new Error(response.message || '生成失败')
        }
      } catch (err) {
        console.error('AI 生成错误:', err)
        error.value = err.response?.data?.message || err.message || '发送失败，请重试'
        
        // 添加错误消息
        messages.value.push({
          role: 'assistant',
          content: '抱歉，我遇到了一些问题，请稍后再试。',
          timestamp: formatTime()
        })
      } finally {
        isLoading.value = false
        scrollToBottom()
      }
    }

    // 清空对话
    const clearChat = () => {
      if (confirm('确定要清空所有对话记录吗？')) {
        messages.value = []
        error.value = ''
      }
    }

    // 获取 AI 提供商信息
    const fetchProviderInfo = async () => {
      try {
        const info = await api.getAIProviderInfo()
        providerInfo.value = info
      } catch (err) {
        console.error('获取提供商信息失败:', err)
      }
    }

    onMounted(() => {
      fetchProviderInfo()
      // 从 localStorage 加载历史消息
      const savedMessages = localStorage.getItem('chatbot-messages')
      if (savedMessages) {
        try {
          messages.value = JSON.parse(savedMessages)
          scrollToBottom()
        } catch (e) {
          console.error('加载历史消息失败:', e)
        }
      }
    })

    // 保存消息到 localStorage
    watch(messages, (newMessages) => {
      try {
        localStorage.setItem('chatbot-messages', JSON.stringify(newMessages))
      } catch (e) {
        console.error('保存消息失败:', e)
      }
    }, { deep: true })

    return {
      messages,
      inputMessage,
      isLoading,
      error,
      messagesContainer,
      inputTextarea,
      providerInfo,
      sendMessage,
      clearChat
    }
  }
}
</script>

<style scoped>
.chatbot-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1rem;
  height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
}

.chatbot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.chatbot-header h1 {
  margin: 0;
  font-size: 1.75rem;
  color: #1f2937;
}

.provider-info {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.provider-badge,
.model-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.provider-badge {
  background: #dbeafe;
  color: #1e40af;
}

.model-badge {
  background: #f3e8ff;
  color: #7c3aed;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 12px;
  margin-bottom: 1rem;
}

.message {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.message.user .message-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message.assistant .message-avatar {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-text {
  background: white;
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.6;
}

.message.user .message-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-time {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.5rem;
}

.loading-dots {
  display: flex;
  gap: 4px;
  padding: 1rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af;
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  text-align: center;
}

.empty-state i {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: #6b7280;
}

.empty-state p {
  margin: 0;
  font-size: 0.9rem;
}

.chat-input-container {
  background: white;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.error-message {
  background: #fee2e2;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}

.chat-input-wrapper {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}

.chat-input-wrapper textarea {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  resize: none;
  min-height: 44px;
  max-height: 120px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.chat-input-wrapper textarea:focus {
  outline: none;
  border-color: #667eea;
}

.chat-input-wrapper textarea:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.btn-send {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
}

.btn-send:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.chat-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.btn-ghost {
  background: transparent;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-ghost:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

@media (max-width: 768px) {
  .chatbot-container {
    padding: 1rem 0.5rem;
  }

  .chatbot-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .chat-messages {
    padding: 0.75rem;
  }

  .message {
    gap: 0.75rem;
  }

  .message-avatar {
    width: 32px;
    height: 32px;
    font-size: 1.25rem;
  }
}
</style>
