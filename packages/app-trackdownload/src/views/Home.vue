<template>
  <div class="home-page">
    <nav class="navbar">
      <div class="navbar-container">
        <router-link to="/" class="brand">持续追踪你的下载</router-link>
        <button class="btn btn-primary" @click="showLogin = true">登录</button>
      </div>
    </nav>

    <main class="main-content">
      <div class="container">
        <div class="card" style="max-width: 960px; margin: 0 auto">
          <div class="text-center mb-3">
            <h2 style="font-size: 1.5rem; margin-bottom: 1rem; color: var(--muted)">
              跟踪你的下载
            </h2>
            <form @submit.prevent="handleSearch" class="flex justify-center items-center gap-3">
              <input v-model="searchQuery" class="input input-rounded" type="search" placeholder="输入主播名称" style="width: 70%" />
              <button type="button" @click="handleSearch" class="btn btn-primary">搜索</button>
            </form>
          </div>

          <div class="results-box">
            <p v-if="!loading && results.length === 0 && !error" class="text-center text-muted">搜索结果将显示在这里。</p>
            <div v-if="error" class="text-center" style="color: #ef4444; padding: 1rem">{{ error }}</div>
            <div v-if="loading" class="text-Ícenter text-muted">正在查询 Twitch...</div>
            <a v-for="item in results" :key="item.id" :href="item.url" target="_blank" rel="noopener noreferrer" class="result-item">
              <div style="flex:1">
                <strong>{{ item.name }}</strong>
                <div class="text-muted">{{ item.description }}</div>
              </div>
              <div>
                <button class="btn btn-sm btn-outline" @click.prevent="subscribe(item)">订阅</button>
              </div>
            </a>
          </div>
        </div>
      </div>
    </main>
  </div>
  <div v-if="showLogin" class="login-overlay">
    <div class="login-card">
      <button class="btn-close" @click="showLogin = false">×</button>
      <Login @verified="onVerified" @sent="onSent" @error="onLoginError" />
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { api } from '../api'
import Login from '../../../shared-auth/Login.vue'

export default {
  components: { Login },
  setup() {
    const searchQuery = ref('')
    const loading = ref(false)
    const results = ref([])
    const error = ref('')
    const showLogin = ref(false)
    const onVerified = () => { showLogin.value = false }
    const onSent = () => {}
    const onLoginError = e => { console.error(e) }

    const handleSearch = async () => {
      if (!searchQuery.value.trim()) return
      loading.value = true
      try {
        const data = await api.searchTwitch(searchQuery.value)
        results.value = data
      } catch (e) {
        error.value = '搜索失败'
      } finally {
        loading.value = false
      }
    }

    const subscribe = () => alert('订阅功能开发中')

    return { searchQuery, loading, results, error, handleSearch, subscribe, showLogin, onVerified, onSent, onLoginError }
  }
}
</script>

<style scoped>
.home-page { min-height:100vh }
.result-item { display:flex; justify-content:space-between; padding:0.75rem; border-radius:8px; margin-bottom:0.5rem; text-decoration:none; color:inherit }
.login-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000 }
.login-card { width: 420px; max-width: 95%; background: var(--card, #fff); padding: 1rem; border-radius: 8px; position: relative }
.btn-close { position: absolute; right: 8px; top: 8px; border: none; background: transparent; font-size: 1.25rem }
</style>
