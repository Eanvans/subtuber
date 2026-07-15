<template>
  <div class="settings-page">
    <div class="main-content">
      <button class="btn btn-ghost" @click="$router.back()">← 返回</button>
      
      <div class="header-row">
        <h2>用户设置</h2>
        <button @click="handleLogout" class="btn btn-danger">注销登录</button>
      </div>
      
      <div v-if="loading" class="loading-state">
        <p>加载中...</p>
      </div>

      <div v-else-if="!getUserHash()" class="empty-state">
        <p>⚠️ 用户信息不完整，请重新登录</p>
        <button @click="handleLogout" class="btn btn-primary">重新登录</button>
      </div>

      <div v-else-if="user" class="settings-container">
        <!-- 基本信息卡片 -->
        <div class="card">
          <h3 class="card-title">基本信息</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">显示名称</span>
              <span class="info-value">{{ user.displayName }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">邮箱</span>
              <span class="info-value">{{ user.email }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">注册时间</span>
              <span class="info-value">{{ formatDate(user.registeredAt) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">最后登录</span>
              <span class="info-value">{{ formatDate(user.lastLoginAt) }}</span>
            </div>
          </div>
        </div>

        <!-- API Key 管理卡片 -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">API Key 管理</h3>
            <button @click="showAddModal = true" class="btn btn-primary">
              <span class="icon">+</span> 添加 API Key
            </button>
          </div>

          <div v-if="apiKeys.length === 0" class="empty-state">
            <p>暂无 API Key，点击上方按钮添加</p>
          </div>

          <div v-else class="api-keys-list">
            <div v-for="key in apiKeys" :key="key.id" class="api-key-item">
              <div class="api-key-header">
                <div class="api-key-info">
                  <h4 class="api-key-label">
                    {{ key.label || '未命名' }}
                    <span v-if="key.isDefault" class="badge badge-primary">默认</span>
                    <span v-if="!key.isEnabled" class="badge badge-gray">已禁用</span>
                  </h4>
                  <span class="api-key-provider">{{ getProviderName(key.provider) }}</span>
                </div>
                <div class="api-key-actions">
                  <button @click="toggleKeyVisibility(key.id)" class="btn-icon" title="显示/隐藏">
                    {{ visibleKeys.has(key.id) ? '👁️' : '👁️‍🗨️' }}
                  </button>
                  <button @click="editApiKey(key)" class="btn-icon" title="编辑">
                    ✏️
                  </button>
                  <button @click="deleteKey(key.id)" class="btn-icon btn-danger" title="删除">
                    🗑️
                  </button>
                </div>
              </div>
              
              <div class="api-key-details">
                <div class="api-key-value">
                  <span class="info-label">API Key</span>
                  <code class="key-display">{{ 
                    visibleKeys.has(key.id) ? key.apiKey : maskApiKey(key.apiKey) 
                  }}</code>
                </div>
                
                <div class="api-key-meta">
                  <div v-if="key.notes" class="meta-item">
                    <span class="info-label">备注</span>
                    <span class="info-value">{{ key.notes }}</span>
                  </div>
                  <div v-if="key.expiresAt" class="meta-item">
                    <span class="info-label">过期时间</span>
                    <span class="info-value">{{ formatDate(key.expiresAt) }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="info-label">创建时间</span>
                    <span class="info-value">{{ formatDate(key.createdAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 偏好设置卡片 -->
        <div class="card" v-if="user.preferences">
          <h3 class="card-title">偏好设置</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">语言</span>
              <span class="info-value">{{ user.preferences.language }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">时区</span>
              <span class="info-value">{{ user.preferences.timezone }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">邮件通知</span>
              <span class="info-value">{{ user.preferences.emailNotifications ? '已启用' : '已禁用' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <p>未找到用户信息</p>
      </div>
    </div>

    <!-- 添加/编辑 API Key 弹窗 -->
    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ showEditModal ? '编辑 API Key' : '添加 API Key' }}</h3>
          <button @click="closeModal" class="btn-close">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>提供商 *</label>
            <select v-model="formData.provider" required>
              <option value="">请选择提供商</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="google">Google (Gemini)</option>
              <option value="deepseek">DeepSeek</option>
              <option value="zhipu">智谱 AI</option>
              <option value="moonshot">月之暗面 (Kimi)</option>
              <option value="alibaba">阿里云</option>
              <option value="tencent">腾讯云</option>
              <option value="baidu">百度</option>
              <option value="other">其他</option>
            </select>
          </div>

          <div class="form-group">
            <label>API Key *</label>
            <input 
              v-model="formData.apiKey" 
              type="password"
              placeholder="请输入 API Key"
              required
            />
          </div>

          <div class="form-group">
            <label>标签</label>
            <input 
              v-model="formData.label" 
              type="text"
              placeholder="例如：工作账号、个人账号"
            />
          </div>

          <div class="form-group">
            <label>备注</label>
            <textarea 
              v-model="formData.notes" 
              rows="3"
              placeholder="可选的备注信息"
            ></textarea>
          </div>

          <div class="form-group">
            <label>过期时间</label>
            <input 
              v-model="formData.expiresAt" 
              type="datetime-local"
            />
          </div>

          <div class="form-group-inline">
            <label class="checkbox-label">
              <input v-model="formData.isDefault" type="checkbox" />
              设为默认
            </label>
            <label class="checkbox-label">
              <input v-model="formData.isEnabled" type="checkbox" />
              启用
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeModal" class="btn btn-ghost">取消</button>
          <button @click="submitForm" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? '提交中...' : (showEditModal ? '保存' : '添加') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { api } from '../api'
import { showNotification } from '../utils/notification'

export default {
  setup() {
    const router = useRouter()
    const { currentUser, logout } = useAuth()
    
    const loading = ref(true)
    const user = computed(() => currentUser.value)
    const apiKeys = ref([])
    const visibleKeys = ref(new Set())
    
    // 获取用户 hash（兼容多种字段名）
    const getUserHash = () => {
      const u = user.value
      if (!u) {
        console.log('getUserHash: 用户对象为空')
        return null
      }
      
      // 打印用户对象的所有键
      console.log('用户对象的所有键:', Object.keys(u))
      console.log('用户对象完整内容:', JSON.stringify(u, null, 2))
      
      // 尝试多种可能的字段名：userId, user_id, userHash, user_hash, hash, id
      const hash = u.userId || u.user_id || u.userHash || u.user_hash || u.hash || u.id || null
      console.log('获取到的 hash:', hash)
      
      return hash
    }
    
    // 弹窗状态
    const showAddModal = ref(false)
    const showEditModal = ref(false)
    const submitting = ref(false)
    const editingKeyId = ref(null)
    
    // 表单数据
    const formData = ref({
      provider: '',
      apiKey: '',
      label: '',
      notes: '',
      expiresAt: '',
      isDefault: false,
      isEnabled: true
    })

    // 提供商名称映射
    const getProviderName = (provider) => {
      const names = {
        openai: 'OpenAI',
        anthropic: 'Anthropic (Claude)',
        google: 'Google (Gemini)',
        deepseek: 'DeepSeek',
        zhipu: '智谱 AI',
        moonshot: '月之暗面 (Kimi)',
        alibaba: '阿里云',
        tencent: '腾讯云',
        baidu: '百度',
        other: '其他'
      }
      return names[provider] || provider
    }
    
    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // 遮罩 API Key
    const maskApiKey = (key) => {
      if (!key) return ''
      if (key.length <= 8) return '********'
      return key.substring(0, 4) + '********' + key.substring(key.length - 4)
    }

    // 切换 Key 可见性
    const toggleKeyVisibility = (keyId) => {
      if (visibleKeys.value.has(keyId)) {
        visibleKeys.value.delete(keyId)
      } else {
        visibleKeys.value.add(keyId)
      }
    }

    // 加载 API Keys
    const loadApiKeys = async () => {
      const userHash = getUserHash()
      if (!userHash) {
        console.warn('无法获取用户 hash，跳过加载 API Keys')
        loading.value = false
        return
      }

      try {
        const response = await api.getUserApiKeys(userHash)
        if (response.success) {
          apiKeys.value = response.data || []
        } else {
          console.error('API 返回失败:', response)
          showNotification(response.message || '加载 API Keys 失败', 'error')
        }
      } catch (error) {
        console.error('加载 API Keys 失败:', error)
        const errorMsg = error.response?.data?.message || error.message || '加载 API Keys 失败'
        showNotification(errorMsg, 'error')
      } finally {
        loading.value = false
      }
    }

    // 重置表单
    const resetForm = () => {
      formData.value = {
        provider: '',
        apiKey: '',
        label: '',
        notes: '',
        expiresAt: '',
        isDefault: false,
        isEnabled: true
      }
      editingKeyId.value = null
    }

    // 关闭弹窗
    const closeModal = () => {
      showAddModal.value = false
      showEditModal.value = false
      resetForm()
    }

    // 编辑 API Key
    const editApiKey = (key) => {
      formData.value = {
        provider: key.provider || '',
        apiKey: key.apiKey || '',
        label: key.label || '',
        notes: key.notes || '',
        expiresAt: key.expiresAt ? new Date(key.expiresAt).toISOString().slice(0, 16) : '',
        isDefault: key.isDefault || false,
        isEnabled: key.isEnabled !== false
      }
      editingKeyId.value = key.id
      showEditModal.value = true
    }

    // 提交表单
    const submitForm = async () => {
      if (!formData.value.provider || !formData.value.apiKey) {
        showNotification('请填写必填项', 'error')
        return
      }

      submitting.value = true
      try {
        const data = {
          provider: formData.value.provider,
          api_key: formData.value.apiKey,
          label: formData.value.label,
          notes: formData.value.notes,
          expires_at: formData.value.expiresAt || '',
          is_default: formData.value.isDefault,
          is_enabled: formData.value.isEnabled
        }

        if (showEditModal.value && editingKeyId.value) {
          // 更新
          const response = await api.updateApiKey(editingKeyId.value, data)
          if (response.success) {
            showNotification('API Key 更新成功', 'success')
            await loadApiKeys()
            closeModal()
          }
        } else {
          // 新增
          const userHash = getUserHash()
          if (!userHash) {
            showNotification('无法获取用户信息', 'error')
            return
          }
          data.user_hash = userHash
          const response = await api.createApiKey(data)
          if (response.success) {
            showNotification('API Key 添加成功', 'success')
            await loadApiKeys()
            closeModal()
          }
        }
      } catch (error) {
        console.error('提交失败:', error)
        showNotification(error.response?.data?.message || '操作失败', 'error')
      } finally {
        submitting.value = false
      }
    }

    // 删除 API Key
    const deleteKey = async (keyId) => {
      if (!confirm('确定要删除这个 API Key 吗？')) {
        return
      }

      try {
        const response = await api.deleteApiKey(keyId)
        if (response.success) {
          showNotification('API Key 删除成功', 'success')
          await loadApiKeys()
        }
      } catch (error) {
        console.error('删除失败:', error)
        showNotification('删除失败', 'error')
      }
    }
    
    // 注销登录
    const handleLogout = async () => {
      if (confirm('确定要注销登录吗？')) {
        await logout()
        router.push('/')
      }
    }

    onMounted(() => {
      // 调试：打印用户信息结构
      console.log('当前用户信息:', user.value)
      console.log('用户 Hash:', getUserHash())
      
      loadApiKeys()
    })
    
    return { 
      loading,
      user, 
      apiKeys,
      visibleKeys,
      showAddModal,
      showEditModal,
      submitting,
      formData,
      formatDate, 
      handleLogout,
      getProviderName,
      maskApiKey,
      toggleKeyVisibility,
      editApiKey,
      deleteKey,
      closeModal,
      submitForm,
      getUserHash
    }
  }
}
</script>

<style scoped>
.settings-page { 
  padding: 1rem;
}

.main-content {
  max-width: 960px;
  margin: 0 auto;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header-row h2 {
  margin: 0;
}

.settings-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--muted-2, #6b7280);
}

.card {
  background: var(--card, #ffffff);
  border: 1px solid var(--border, rgba(15, 23, 42, 0.06));
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm, 0 1px 6px rgba(16, 24, 40, 0.06));
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: var(--muted, #374151);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.875rem;
  color: var(--muted-2, #6b7280);
  font-weight: 500;
}

.info-value {
  font-size: 1rem;
  color: var(--muted, #374151);
  word-break: break-word;
}

/* API Keys List */
.api-keys-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.api-key-item {
  border: 1px solid var(--border, rgba(15, 23, 42, 0.06));
  border-radius: 8px;
  padding: 1rem;
  background: var(--bg, #f8fafc);
  transition: all 0.2s;
}

.api-key-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.api-key-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.api-key-info {
  flex: 1;
}

.api-key-label {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: var(--muted, #374151);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.api-key-provider {
  font-size: 0.875rem;
  color: var(--muted-2, #6b7280);
}

.api-key-actions {
  display: flex;
  gap: 0.5rem;
}

.api-key-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.api-key-value {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.key-display {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 0.875rem;
  background: white;
  border: 1px solid var(--border, rgba(15, 23, 42, 0.06));
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  color: var(--muted, #374151);
  word-break: break-all;
}

.api-key-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-primary {
  background: #3b82f6;
  color: white;
}

.badge-gray {
  background: #6b7280;
  color: white;
}

/* Buttons */
.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-ghost {
  background: transparent;
  color: var(--muted, #374151);
}

.btn-ghost:hover {
  background: var(--bg, #f1f5f9);
}

.btn-icon {
  background: transparent;
  border: none;
  padding: 0.375rem;
  cursor: pointer;
  border-radius: 4px;
  font-size: 1.125rem;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: var(--bg, #e2e8f0);
}

.btn-icon.btn-danger:hover {
  background: #fee2e2;
}

.icon {
  font-size: 1.25rem;
  line-height: 1;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border, rgba(15, 23, 42, 0.06));
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  color: var(--muted-2, #6b7280);
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--bg, #f1f5f9);
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border, rgba(15, 23, 42, 0.06));
}

/* Form */
.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--muted, #374151);
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--border, rgba(15, 23, 42, 0.15));
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group textarea {
  resize: vertical;
}

.form-group-inline {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--muted, #374151);
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

@media (max-width: 768px) {
  .settings-page {
    padding: 0.5rem;
  }

  .header-row {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .api-key-header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .api-key-actions {
    justify-content: flex-start;
  }

  .form-group-inline {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>
