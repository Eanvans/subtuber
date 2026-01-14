<template>
  <div id="app">
    <!-- 全局通知 Banner -->
    <transition name="slide-down">
      <div v-if="showNotification" class="notification-banner">
        <span>{{ notificationMessage }}</span>
        <button @click="showNotification = false" class="notification-close">×</button>
      </div>
    </transition>
    
    <nav class="navbar">
      <div class="navbar-container">
        <router-link to="/" class="brand">SubTuber</router-link>
        <div class="nav-links">
          <router-link to="/" class="nav-link">我的订阅</router-link>
          <router-link to="/market" class="nav-link">主播广场</router-link>
        </div>
        <div class="nav-actions">
          <router-link v-if="currentUser" to="/settings" class="btn btn-ghost">
            <i class="bi bi-person-circle" aria-hidden="true"></i>
            {{ currentUser.displayName || currentUser.email }}
          </router-link>
          <button v-else class="btn btn-primary" @click="showLogin = true">登录</button>
        </div>
      </div>
    </nav>

    <router-view />

    <footer class="app-footer">
      <div class="footer-container">
        <div class="footer-main">
          <div class="footer-section platform-section">
            <div class="footer-text">
              <span class="platform-badge supported">Twitch</span> 已支持
              <span class="separator">·</span>
              <span class="platform-badge developing">YouTube</span> 
              <span class="platform-badge developing">Bilibili</span> 
              开发中
            </div>
          </div>

          <div class="footer-section qr-section">
            <span class="footer-hint">开发交流与反馈：</span>
            <div class="qr-codes">
              <div class="qr-item">
                <div class="qr-placeholder">
                  <img src="../images/qq.png" alt="QQ群二维码" class="qr-image" />
                </div>
                <span class="qr-label">QQ群</span>
              </div>
            </div>
          </div>

          <div class="footer-section links-section">
            <p class="copyright">© {{ currentYear }} SubTuber</p>
            <p class="footer-links">
              <a href="https://github.com/Eanvans/subtuber" target="_blank" rel="noopener">GitHub</a>
              <span class="separator">·</span>
              <a href="#" @click.prevent>隐私</a>
              <span class="separator">·</span>
              <a href="#" @click.prevent>条款</a>
            </p>
          </div>
        </div>
      </div>
    </footer>

    <div v-if="showLogin" class="login-overlay">
      <div class="login-card">
        <button class="btn-close" @click="showLogin = false">×</button>
        <Login @verified="onVerified" @sent="onSent" @error="onLoginError" />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import Login from '../../shared-auth/Login.vue'
import { useAuth } from './composables/useAuth'

export default {
  name: 'App',
  components: { Login },
  setup() {
    const router = useRouter()
    const showLogin = ref(false)
    const { currentUser, setUser } = useAuth()
    const currentYear = new Date().getFullYear()
    const showNotification = ref(false)
    const notificationMessage = ref('')

    // 全局通知处理
    const handleShowNotification = (event) => {
      notificationMessage.value = event.detail.message
      showNotification.value = true
      setTimeout(() => {
        showNotification.value = false
      }, 3000)
    }

    onMounted(() => {
      window.addEventListener('show-notification', handleShowNotification)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('show-notification', handleShowNotification)
    })

    const onVerified = (res) => {
      showLogin.value = false
      const user = res && res.user ? res.user : null
      if (user) {
        setUser(user)
        // 登录成功后跳转到首页
        router.push('/')
      }
    }
    const onSent = () => {}
    const onLoginError = (e) => { console.error(e) }

    return { 
      showLogin, 
      currentUser, 
      currentYear, 
      onVerified, 
      onSent, 
      onLoginError,
      showNotification,
      notificationMessage
    }
  }
}
</script>

<style>
.notification-banner {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 1rem;
  z-index: 1000;
  min-width: 300px;
  max-width: 500px;
}

.notification-close {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.notification-close:hover {
  opacity: 1;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.login-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.login-card {
  width: 420px;
  max-width: 95%;
  background: var(--card, #fff);
  padding: 1rem;
  border-radius: 8px;
  position: relative;
}
.btn-close {
  position: absolute;
  right: 8px;
  top: 8px;
  border: none;
  background: transparent;
  font-size: 1.25rem;
}

/* Footer Styles */
.app-footer {
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  margin-top: 2rem;
  padding: 1.5rem 1rem;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
}

.footer-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  flex-wrap: wrap;
}

.footer-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.platform-section {
  flex: 1;
  min-width: 280px;
}

.qr-section {
  flex: 0 0 auto;
}

.links-section {
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.footer-text {
  margin: 0;
  color: #6b7280;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.platform-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.platform-badge.supported {
  background: #d1fae5;
  color: #059669;
}

.platform-badge.developing {
  background: #fef3c7;
  color: #d97706;
}

.qr-codes {
  display: flex;
  gap: 1rem;
}

.qr-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.qr-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.qr-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.qr-label {
  font-size: 0.7rem;
  color: #6b7280;
  font-weight: 500;
}

.footer-hint {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0;
  white-space: nowrap;
}

.copyright {
  margin: 0;
  color: #6b7280;
  font-size: 0.85rem;
  white-space: nowrap;
}

.footer-links {
  margin: 0;
  font-size: 0.8rem;
  white-space: nowrap;
}

.footer-links a {
  color: #3b82f6;
  text-decoration: none;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: #2563eb;
  text-decoration: underline;
}

.footer-links .separator,
.footer-text .separator {
  margin: 0 0.25rem;
  color: #9ca3af;
}

@media (max-width: 768px) {
  .footer-main {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .links-section {
    align-items: flex-start;
    width: 100%;
  }
  
  .platform-section {
    min-width: auto;
  }
  
  .app-footer {
    padding: 1rem;
  }
}
</style>
