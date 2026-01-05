<template>
  <div class="home-page">
    <nav class="navbar">
      <div class="navbar-container">
        <router-link to="/" class="brand">SubTuber</router-link>
        <div class="nav-actions">
          <router-link v-if="currentUser" to="/settings" class="btn btn-ghost"
            ><i class="bi bi-person-circle" aria-hidden="true"></i>
            {{ currentUser.displayName || currentUser.email }}</router-link
          >
          <button v-else class="btn btn-primary" @click="showLogin = true">
            登录
          </button>
        </div>
      </div>
    </nav>

    <main class="main-content">
        <div class="card" style="max-width: 960px; margin: 0 auto">
          <div class="text-left mb-3">
            <h2
              style="
                font-size: 1.5rem;
                margin-bottom: 1rem;
                color: var(--muted);
              "
            >
              订阅你喜欢的主播
            </h2>
            <p class="subtitle">自动获取lumi近期直播中的高光时刻以及ai分析高光内容</p>
          </div>

          <!-- Kanekolumi live card -->
          <div class="live-section">
            <div class="live-card" v-if="statusChecked">
              <div class="live-top">
                <img
                  v-if="thumbnail"
                  :src="thumbnail"
                  alt="thumb"
                  class="thumb"
                />
                <div class="live-info">
                  <div class="title-row">
                    <img v-if="avatarUrl" :src="avatarUrl" alt="avatar" class="avatar" />
                    <h3 class="streamer">kanekolumi</h3>
                    <span
                      :class="['live-badge', isLive ? 'live' : 'offline']"
                      >{{ isLive ? "LIVE" : "OFFLINE" }}</span
                    >
                  </div>
                  <p class="stream-title">
                    {{ streamTitle || (isLive ? "正在直播：" + streamTitle : "") }}
                  </p>
                  <div class="meta">
                    <span v-if="viewerCount">观众: {{ viewerCount }}</span>
                    <span class="platforms">
                      <span v-for="p in platforms" :key="p" class="platform">
                        <svg v-if="pDisplay(p) === 'Twitch'" class="platform-icon" viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="2" y="3" width="16" height="14" rx="2" ry="2" fill="#6441A5" />
                          <path d="M6 19v2h3v-2" fill="#6441A5" />
                          <path d="M9 7h2v3H9zM13 7h2v3h-2z" fill="#fff" />
                        </svg>
                        {{ pDisplay(p) }}
                      </span>
                    </span>
                  </div>
                  <div class="actions">
                    <a
                      v-if="isLive && liveUrl"
                      :href="liveUrl"
                      target="_blank"
                      class="btn btn-primary"
                      >前往观看</a
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- Mock recordings placeholders for future VODs -->
            <div class="recordings">
              <div class="recording-list">
                <div class="recording-card" v-for="v in mockVideos" :key="v.id">
                  <div class="rec-info">
                    <div class="rec-title">{{ v.title }}</div>
                    <div class="rec-meta">{{ v.platform }} · {{ v.duration }}</div>

                    <!-- Inline line chart placeholder (comments over time) -->
                    <div class="rec-chart">
                      <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="chart-svg" role="img" aria-label="comments over time">
                        <g class="grid">
                          <path :d="gridPath(chartWidth, chartHeight)" stroke="#eee" fill="none" />
                        </g>
                        <path :d="computePath(v.points, chartWidth, chartHeight)" class="chart-path" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </div>

                  </div>
                </div>
              </div>
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
import { ref, onMounted } from "vue";
import { api } from "../api";
import Login from "../../../shared-auth/Login.vue";

export default {
  components: { Login },
  setup() {
    const searchQuery = ref("");
    const loading = ref(false);
    const results = ref([]);
    const error = ref("");
    const showLogin = ref(false);
    const currentUser = ref(null);
    try {
      const u = localStorage.getItem("UserInfo");
      currentUser.value = u ? JSON.parse(u) : null;
    } catch (e) {
      currentUser.value = null;
    }
    const onVerified = (res) => {
      showLogin.value = false;
      const user = res && res.user ? res.user : null;
      if (user) {
        currentUser.value = user;
        try {
          localStorage.setItem("UserInfo", JSON.stringify(user));
        } catch (e) {
          console.error(e);
        }
      }
    };
    const onSent = () => {};
    const onLoginError = (e) => {
      console.error(e);
    };

    // Live status refs
    const isLive = ref(false);
    const platforms = ref([]);
    const streamTitle = ref("");
    const viewerCount = ref(null);
    const thumbnail = ref("");
    const liveUrl = ref("");
    const statusChecked = ref(false);
    const loadingStatus = ref(false);

    // Streamer avatar (fallback)
    const avatarUrl = ref('https://static-cdn.jtvnw.net/jtv_user_pictures/7ef8599e-5252-43b4-a4fa-baff1a73e78c-profile_image-70x70.png');

    // Mock recordings placeholder data (each has sample points for the future comments-over-time chart)
    const mockVideos = ref([
      {
        id: 1,
        title: "【占位】Kanekolumi 直播回放 #1",
        platform: "Twitch",
        duration: "1:20:34",
        points: [2, 5, 3, 8, 6, 9, 7],
      },
      {
        id: 2,
        title: "【占位】Kanekolumi 直播回放 #2",
        platform: "YouTube",
        duration: "0:45:10",
        points: [1, 2, 4, 3, 5, 4],
      },
      {
        id: 3,
        title: "【占位】Kanekolumi 直播回放 #3",
        platform: "Twitch",
        duration: "2:03:21",
        points: [3, 6, 5, 7, 6, 8, 10],
      },
    ]);

    // Chart dimensions used by inline SVGs
    const chartWidth = 220;
    const chartHeight = 60;

    const gridPath = (w, h) => {
      // simple horizontal grid line
      const y = Math.round(h / 2);
      return `M0 ${y} L ${w} ${y}`;
    };

    const computePath = (points = [], w = chartWidth, h = chartHeight) => {
      if (!points || points.length === 0) return "";
      const pad = 6;
      const xs = points.length === 1 ? [w / 2] : points.map((_, i) => pad + (i * (w - pad * 2)) / (points.length - 1));
      const max = Math.max(...points);
      const min = Math.min(...points);
      const range = max - min || 1;
      const ys = points.map((v) => pad + (1 - (v - min) / range) * (h - pad * 2));
      let d = `M ${xs[0].toFixed(2)} ${ys[0].toFixed(2)}`;
      for (let i = 1; i < xs.length; i++) {
        d += ` L ${xs[i].toFixed(2)} ${ys[i].toFixed(2)}`;
      }
      return d;
    };

    const pDisplay = (p) => {
      if (!p) return "未知平台";
      const key = p.toLowerCase();
      if (key.includes("twitch")) return "Twitch";
      if (key.includes("youtube")) return "YouTube";
      return p;
    };

    const checkLive = async () => {
      try {
        loadingStatus.value = true;
        const res = await fetch("/api/twitch/status");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        isLive.value = !!data.live;
        platforms.value =
          data.platforms || (data.platform ? [data.platform] : []);
        streamTitle.value = data.title || "";
        viewerCount.value = data.viewer_count || data.viewers || null;
        thumbnail.value = data.thumbnail || "";
        liveUrl.value = data.url || data.stream_url || "";
      } catch (e) {
        console.error("checkLive error", e);
      } finally {
        statusChecked.value = true;
        loadingStatus.value = false;
      }
    };

    onMounted(() => {
      checkLive();
      setInterval(checkLive, 30000);
    });

    const handleSearch = async () => {
      if (!searchQuery.value.trim()) return;
      loading.value = true;
      try {
        const data = await api.searchTwitch(searchQuery.value);
        results.value = data;
      } catch (e) {
        error.value = "搜索失败";
      } finally {
        loading.value = false;
      }
    };

    const subscribe = () => alert("订阅功能开发中");

    return {
      searchQuery,
      loading,
      results,
      error,
      handleSearch,
      subscribe,
      showLogin,
      onVerified,
      onSent,
      onLoginError,
      currentUser,
      // live
      isLive,
      platforms,
      streamTitle,
      viewerCount,
      thumbnail,
      liveUrl,
      statusChecked,
      avatarUrl,
      mockVideos,
      chartWidth,
      chartHeight,
      computePath,
      gridPath,
      pDisplay,
    };
  },
};
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1 1 auto;
  overflow: auto;
}

.card {
  min-height: 70vh;
}

.result-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  text-decoration: none;
  color: inherit;
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

/* Live card styles */
.live-section {
  margin-top: 1rem;
}
.live-card {
  background: var(--card, #fff);
  padding: 0.75rem;
  border-radius: 8px;
  display: block;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.live-top {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.thumb {
  width: 140px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
}
.live-info {
  flex: 1;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.streamer {
  margin: 0;
  font-size: 1.1rem;
}
.live-badge {
  padding: 4px 8px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.75rem;
}
.live-badge.live {
  background: #ff4d4f;
  color: #fff;
}
.live-badge.offline {
  background: #f0f0f0;
  color: #666;
}
.stream-title {
  margin: 6px 0;
  color: var(--muted);
}
.subtitle {
  font-size: 0.95rem;
  color: #6b7280;
  margin-top: 0.25rem;
}
.meta {
  font-size: 0.85rem;
  color: #666;
  display: flex;
  gap: 12px;
  align-items: center;
}
.platforms .platform {
  background: #eee;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.78rem;
}
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}
.platform-icon {
  width: 14px;
  height: 14px;
  margin-right: 6px;
  vertical-align: middle;
}
.actions {
  margin-top: 8px;
}

.recordings {
  margin-top: 1rem;
}
.recording-list {
  display: block;
  gap: 12px;
}
.recording-card {
  width: 100%;
  background: #fafafa;
  padding: 10px;
  border-radius: 6px;
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}
.rec-title {
  font-weight: 600;
}
.rec-meta {
  color: #777;
  font-size: 0.85rem;
}

.rec-chart { margin-top: 8px; }
.chart-svg { width: 100%; height: auto; display: block; }
.chart-path { stroke: #3b82f6; }
</style>
