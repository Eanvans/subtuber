<template>
  <div class="home-page">
    <nav class="navbar">
      <div class="navbar-container">
          <router-link to="/" class="brand">订阅我推的主播</router-link>
          <div class="nav-actions">
            <router-link v-if="currentUser" to="/settings" class="btn btn-ghost"><i class="bi bi-person-circle" aria-hidden="true"></i> {{ currentUser.displayName || currentUser.email  }}</router-link>
            <button v-else class="btn btn-primary" @click="showLogin = true">登录</button>
          </div>
        </div>
    </nav>

    <main class="main-content">
      <div class="container">
        <div class="card" style="max-width: 960px; margin: 0 auto">
          <div class="text-center mb-3">
            <h2 style="font-size: 1.5rem; margin-bottom: 1rem; color: var(--muted)">
              查找你喜欢的主播
            </h2>
            <form @submit.prevent="handleSearch" class="flex justify-center items-center gap-3">
              <input
                v-model="searchQuery"
                class="input input-rounded"
                type="search"
                placeholder="输入主播名称，例如：某某"
                style="width: 70%"
                @keydown.enter="handleSearch"
              />
              <button type="button" @click="handleSearch" class="btn btn-primary">搜索</button>
            </form>
          </div>

          <div class="results-box" aria-live="polite" aria-atomic="true">
            <p v-if="!loading && results.length === 0 && !error" class="text-center text-muted">
              搜索结果将显示在这里。
            </p>

            <div v-if="error" class="text-center" style="color: #ef4444; padding: 1rem">
              {{ error }}
            </div>

            <div v-if="loading" class="text-center text-muted">正在查询 Twitch...</div>

            <a
              v-for="item in results"
              :key="item.id"
              :href="item.url"
              target="_blank"
              rel="noopener noreferrer"
              class="result-item"
              style="text-decoration: none; color: inherit; display: flex"
            >
              <img v-if="item.avatar" :src="item.avatar" :alt="item.name" class="result-avatar" />
              <div style="flex: 1">
                <div
                  style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem"
                >
                  <strong>{{ item.name }}</strong>
                  <span class="platform-badge">Twitch</span>
                </div>
                <div class="text-muted" style="font-size: 0.875rem; margin-bottom: 0.25rem">
                  {{ item.description }}
                </div>
                <div class="stats" style="font-size: 0.8rem; color: var(--muted-2)">
                  <span v-if="item.followerCount"
                    >👥 {{ formatNumber(item.followerCount) }} 关注</span
                  >
                  <span v-if="item.viewCount"> · 👁 {{ formatNumber(item.viewCount) }} 观看</span>
                </div>
              </div>
              <div>
                <button class="btn btn-sm btn-outline" @click.prevent="subscribe(item)">
                  订阅
                </button>
              </div>
            </a>
          </div>
        </div>
      </div>
    </main>

    <footer class="footer-fixed">Privacy: 本站仅用于演示，不收集个人隐私信息。</footer>
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
  name: 'Home',
  components: { Login },
  setup() {
    const searchQuery = ref('')
    const loading = ref(false)
    const results = ref([])
    const error = ref('')
    const showLogin = ref(false)
    const currentUser = ref(null)
    // load from localStorage
    try { const u = localStorage.getItem('user'); currentUser.value = u ? JSON.parse(u) : null } catch(e){ currentUser.value = null }

    const onVerified = res => {
      showLogin.value = false
      const user = res && res.user ? res.user : null
      if (user) {
        currentUser.value = user
        try { localStorage.setItem('user', JSON.stringify(user)) } catch (e) {}
      }
    }
    const onSent = payload => { /* optional: show toast */ }
    const onLoginError = err => { console.error('login error', err) }

    const handleSearch = async () => {
      const query = searchQuery.value.trim()
      if (!query) {
        return
      }

      loading.value = true
      results.value = []
      error.value = ''

      try {
        const data = await api.searchTwitch(query)

        results.value = data.map(channel => ({
          id: channel.id,
          name: channel.display_name,
          description: channel.description || '暂无简介',
          login: channel.login,
          avatar: channel.profile_image_url,
          viewCount: channel.view_count,
          followerCount: channel.follower_count,
          url: `https://www.twitch.tv/${channel.login}`
        }))
      } catch (err) {
        console.error('搜索失败:', err)
        error.value = '搜索失败，请稍后重试'
      } finally {
        loading.value = false
      }
    }

    const formatNumber = num => {
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + 'w'
      }
      if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k'
      }
      return num.toString()
    }

    const subscribe = item => {
      alert(`订阅功能开发中\\n频道: ${item.name}`)
    }

    return {
      searchQuery,
      loading,
      results,
      error,
      handleSearch,
      formatNumber,
      subscribe
      , showLogin,
      onVerified,
      onSent,
      onLoginError,
      currentUser
    }
  }
}
</script>

<style scoped>
.login-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000 }
.login-card { width: 420px; max-width: 95%; background: var(--card, #fff); padding: 1rem; border-radius: 8px; position: relative }
.btn-close { position: absolute; right: 8px; top: 8px; border: none; background: transparent; font-size: 1.25rem }
.home-page { min-height: 100vh; display: flex; flex-direction: column }
.main-content { flex: 1; padding: 2.25rem 0; display: flex; align-items: flex-start }
.results-box { margin-top: 1.125rem; height: 60vh; overflow-y: auto; padding: 0.75rem; background: #ffffff; border-radius: 8px; border: 1px solid var(--border) }
.result-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-radius: 8px; margin-bottom: 0.2rem; gap: 1rem }
.result-avatar { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; flex-shrink: 0 }
.platform-badge { display: inline-block; padding: 0.125rem 0.5rem; font-size: 0.75rem; background: #9146ff; color: white; border-radius: 12px; font-weight: 500 }
.footer-fixed { position: fixed; left: 0; right: 0; bottom: 0; background: var(--card); padding: 0.625rem 0.75rem; text-align: center; color: var(--muted-2); font-size: 0.9rem; border-top: 1px solid var(--border) }
</style>
