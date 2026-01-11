<template>
  <div class="settings-page">
    <div class="main-content">
      <button class="btn btn-ghost" @click="$router.back()">← 返回</button>
      
      <div class="header-row">
        <h2>用户设置</h2>
        <button @click="handleLogout" class="btn btn-danger">注销登录</button>
      </div>
      
      <div v-if="user" class="settings-container">
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
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

export default {
  setup() {
    const router = useRouter()
    const { currentUser, logout } = useAuth()
    
    const user = computed(() => currentUser.value)
    
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
    
    const handleLogout = () => {
      if (confirm('确定要注销登录吗？')) {
        logout()
        router.push('/')
      }
    }
    
    return { user, formatDate, handleLogout }
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

.card {
  background: var(--card, #ffffff);
  border: 1px solid var(--border, rgba(15, 23, 42, 0.06));
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm, 0 1px 6px rgba(16, 24, 40, 0.06));
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
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
}

.info-value {
  font-size: 1rem;
  color: var(--muted, #374151);
  word-break: break-word;
}

.user-id {
  font-family: monospace;
  font-size: 0.875rem;
  color: var(--muted-2, #6b7280);
  background: var(--bg, #f8fafc);
  padding: 0.75rem;
  border-radius: 4px;
  word-break: break-all;
}

.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}

.btn-ghost {
  color: var(--muted, #374151);
}

.btn-ghost:hover {
  background: var(--bg, #f1f5f9);
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--muted, #888);
}
</style>
