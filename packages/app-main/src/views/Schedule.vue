<template>
  <div class="schedule-page">
    <nav class="navbar">
      <div class="navbar-container">
        <router-link to="/" class="brand">订阅我推的主播</router-link>
        <ul class="nav-links">
          <li><router-link to="/">主播订阅</router-link></li>
          <li>
            <router-link to="/schedule" class="active">直播日程</router-link>
          </li>
        </ul>
        <button class="btn btn-primary" @click="showLogin = true">登录</button>
      </div>
    </nav>

    <main class="schedule-container">
      <div class="schedule-content">
        <h1>Lumi 直播日程</h1>

        <div v-if="loading" class="text-center text-muted">加载中...</div>

        <div v-else class="events-list">
          <a
            v-for="event in events"
            :key="event.timestamp"
            :href="event.link"
            target="_blank"
            rel="noopener noreferrer"
            class="event"
          >
            <div class="event-content">
              <div class="event-datetime">
                <div class="event-date">{{ formatDate(event.timestamp) }}</div>
                <div class="event-time">{{ formatTime(event.timestamp) }}</div>
              </div>
              <div class="event-details">
                <div class="event-title">{{ event.title }}</div>
                <div class="event-platform">{{ event.platform }}</div>
              </div>
            </div>
            <div class="event-arrow">
              <svg
                width="20"
                height="20"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
          </a>
        </div>
      </div>
    </main>
    <div v-if="showLogin" class="login-overlay">
      <div class="login-card">
        <button class="btn-close" @click="showLogin = false">×</button>
        <Login @verified="onVerified" @sent="onSent" @error="onLoginError" />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import Login from "../../../shared-auth/Login.vue";

export default {
  name: "Schedule",
  components: { Login },
  setup() {
    const loading = ref(true);
    const events = ref([]);
    const showLogin = ref(false);
    const onVerified = () => {
      showLogin.value = false;
    };
    const onSent = () => {};
    const onLoginError = (e) => {
      console.error(e);
    };

    const scheduleData = [
      {
        timestamp: 1754323200,
        platform: "Twitch",
        title: "Stream",
        link: "https://www.twitch.tv/kanekolumi",
      },
    ];

    const formatDate = (timestamp) => {
      const date = new Date(timestamp * 1000);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${month}月${day}日`;
    };

    const formatTime = (timestamp) => {
      const date = new Date(timestamp * 1000);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    };

    onMounted(() => {
      setTimeout(() => {
        events.value = scheduleData;
        loading.value = false;
      }, 300);
    });

    return {
      loading,
      events,
      formatDate,
      formatTime,
      showLogin,
      onVerified,
      onSent,
      onLoginError,
    };
  },
};
</script>

<style scoped>
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
  background: var(--card, #111);
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
.schedule-page {
  min-height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  color: #f1f1f1;
}
.schedule-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  min-height: calc(100vh - 72px);
}
.schedule-content {
  max-width: 600px;
  width: 100%;
}
.event {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1.25rem;
  display: block;
  margin-bottom: 1rem;
}
</style>
