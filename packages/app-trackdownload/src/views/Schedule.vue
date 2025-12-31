<template>
  <div class="schedule-page">
    <nav class="navbar">
      <div class="navbar-container">
        <router-link to="/" class="brand">订阅我推的主播</router-link>
        <button class="btn btn-primary" @click="showLogin = true">登录</button>
      </div>
    </nav>
    <main class="schedule-container"><div class="schedule-content"><h1>日程</h1></div></main>
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
import Login from '../../../shared-auth/Login.vue'

export default {
  name: 'Schedule',
  components: { Login },
  setup() {
    const showLogin = ref(false)
    const onVerified = () => { showLogin.value = false }
    const onSent = () => {}
    const onLoginError = e => { console.error(e) }
    return { showLogin, onVerified, onSent, onLoginError }
  }
}
</script>

<style scoped>
.login-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000 }
.login-card { width: 420px; max-width: 95%; background: var(--card, #fff); padding: 1rem; border-radius: 8px; position: relative }
.btn-close { position: absolute; right: 8px; top: 8px; border: none; background: transparent; font-size: 1.25rem }
.schedule-page { min-height:100vh }
</style>
