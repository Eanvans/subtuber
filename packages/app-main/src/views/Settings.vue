<template>
  <div class="settings-page">
    <h2>用户设置</h2>
    <p>这里显示用户的设置页面（占位）。</p>
    <pre v-if="user">{{ user }}</pre>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  setup() {
    const raw = localStorage.getItem('user')
    let user = null
    try { user = raw ? JSON.parse(raw) : null } catch(e) { user = raw }
    return { user }
  }
}
</script>

<style scoped>
.settings-page { padding: 1rem }
</style>
