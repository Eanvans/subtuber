<template>
  <div id="app">
    <nav class="navbar">
      <div class="navbar-container">
        <router-link to="/" class="brand">SubTuber</router-link>
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

    <div v-if="showLogin" class="login-overlay">
      <div class="login-card">
        <button class="btn-close" @click="showLogin = false">×</button>
        <Login @verified="onVerified" @sent="onSent" @error="onLoginError" />
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import Login from '../../shared-auth/Login.vue'
import { useAuth } from './composables/useAuth'

export default {
  name: 'App',
  components: { Login },
  setup() {
    const showLogin = ref(false)
    const { currentUser, setUser } = useAuth()

    const onVerified = (res) => {
      showLogin.value = false
      const user = res && res.user ? res.user : null
      if (user) {
        setUser(user)
      }
    }
    const onSent = () => {}
    const onLoginError = (e) => { console.error(e) }

    return { showLogin, currentUser, onVerified, onSent, onLoginError }
  }
}
</script>

<style>
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
</style>
