<template>
  <div class="schedule-page">
    <nav class="navbar">
      <div class="navbar-container">
        <router-link to="/" class="brand">订阅我推的主播</router-link>
        <button class="btn btn-primary">登录</button>
      </div>
    </nav>
    <main class="schedule-container"><div class="schedule-content"><h1>日程</h1></div></main>
  </div>
</template>

<script>
export default { name: 'Schedule' }
</script>

<style scoped>
.schedule-page { min-height:100vh }
</style>
