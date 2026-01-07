<template>
  <div class="home-page">
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
                <router-link
                  v-for="v in vods"
                  :key="v.id"
                  :to="{ name: 'recording', params: { video_id: v.video_id } }"
                  class="recording-card"
                >
                  <div class="rec-info">
                    <div class="rec-header">
                      <span class="rec-label">直播标题</span>
                      <div class="rec-title" :title="v.title">{{ v.title }}</div>
                    </div>
                    <div class="rec-meta">{{ v.platform }} · {{ v.duration  }}</div>

                    <!-- Inline line chart placeholder (comments over time) -->
                    <div class="rec-chart">
                      <div style="height:140px; position:relative">
                        <canvas :id="`chart-${v.video_id}`" style="width:100%; height:100%"></canvas>
                      </div>
                    </div>

                  </div>
                </router-link>
              </div>
            </div>
          </div>
        </div>
    </main>
  </div>
  
</template>

<script>
import { ref, onMounted, nextTick, onBeforeUnmount } from "vue";
import { api } from "../api";
import { getStreamers, getTwitchStatus, getAnalysis } from "../api/streamers";
import Chart from "chart.js/auto";

export default {
  setup() {
    const searchQuery = ref("");
    const loading = ref(false);
    const results = ref([]);
    const error = ref("");

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

    // VOD list (will be loaded from the server /api/streamers)
    const vods = ref([]);

    // default/sample points used for inline chart when server does not provide time-series
    const defaultPoints = [1, 3, 2, 5, 4, 6];

    const fetchStreamers = async () => {
      try {
        const list = await getStreamers();
        vods.value = list.map((s) => ({
          id: s.id,
          title: s.title || s.name || '未命名',
          platform: s.platform || '',
          video_id: s.video_id || '',
          duration: s.duration_seconds || s.duration || '',
          created_at: s.created_at || null,
          points: s.points && s.points.length ? s.points : defaultPoints,
          raw: s,
        }));
        // auto-load analysis for each VOD by default
        for (const v of vods.value) {
          // fire-and-forget; loadAnalysis will guard internally
          loadAnalysis(v);
        }
      } catch (e) {
        console.error('fetchStreamers error', e);
        vods.value = [];
      }
    };

    // per-vod analysis cache and chart instances
    const analysisMap = ref({});
    const charts = {};
    const analysisLoading = ref({});

    const setCanvasToScreenWidth = (canvas) => {
      if (!canvas) return;
      const parent = canvas.parentElement || canvas.closest('div');
      const w = parent ? parent.clientWidth : (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth);
      const h = parent ? parent.clientHeight : 120;
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = w + 'px';
      canvas.width = Math.floor(w * dpr);
      canvas.style.height = h + 'px';
      canvas.height = Math.floor(h * dpr);
    };

    const formatOffset = (sec) => {
      if (sec == null || isNaN(sec)) return '';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m}:${String(s).padStart(2, '0')}`;
    };

    const loadAnalysis = async (vod) => {
      if (!vod || !vod.video_id) return;
      const vid = vod.video_id;
      if (analysisMap.value[vid]) return; // already loaded
      try {
        analysisLoading.value = { ...analysisLoading.value, [vid]: true };
        const data = await getAnalysis(vid);
        // expected structure AnalysisResult with TimeSeriesData
        const series = (data && data.time_series_data) ? data.time_series_data : [];
        analysisMap.value = { ...analysisMap.value, [vid]: series };
        await nextTick();
        const canvas = document.querySelector(`#chart-${vid}`);
          if (canvas) {
          // ensure canvas internal size matches parent for crisp rendering
          setCanvasToScreenWidth(canvas);
          let labels = series.map((p) => p.formatted_time || formatOffset(p.offset_seconds));
          labels = labels.map((l) => String(l));
          const values = series.map((p) => p.score ?? 0);
          const pointBg = series.map((p) => p.is_peak ? '#ef4444' : '#3b82f6');
          const pointRadii = series.map((p) => p.is_peak ? 6 : 2);
          if (charts[vid]) {
            charts[vid].data.labels = labels;
            charts[vid].data.datasets[0].data = values;
            charts[vid].update();
            charts[vid].resize();
          } else {
            const ctx = canvas.getContext('2d');

            // determine reasonable tick density based on canvas width
            const canvasWidth = canvas.clientWidth || (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth);
            const approxLabelWidth = 100; // px per label
            const maxTicksLimit = Math.max(2, Math.floor(canvasWidth / approxLabelWidth));
            const step = Math.max(1, Math.ceil(labels.length / maxTicksLimit));
            charts[vid] = new Chart(ctx, {
              type: 'line',
              data: {
                labels,
                datasets: [
                  {
                    label: 'Score',
                    data: values,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.08)',
                    tension: 0.3,
                    pointRadius: pointRadii,
                    pointBackgroundColor: pointBg,
                    pointHoverRadius: 7,
                    fill: true,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: {
                    type: 'category',
                    ticks: {
                      maxRotation: 0,
                      autoSkip: false,
                      callback: function(val, idx) {
                        // show every `step`-th label to avoid overlap; use labels array
                        return (idx % step === 0) ? (labels[idx] || '') : '';
                      },
                      font: { size: 12 },
                      padding: 6,
                    },
                    grid: { display: false },
                  },
                  y: {
                    beginAtZero: true,
                  },
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                      title: (items) => {
                        return items && items[0] ? items[0].label : '';
                      },
                      label: (ctx) => {
                        const v = ctx.parsed.y;
                        const idx = ctx.dataIndex;
                        const peak = series[idx] && series[idx].is_peak ? ' (peak)' : '';
                        return `Score: ${v}${peak}`;
                      }
                    }
                  },
                },
              },
            });
          }
        }
      } catch (e) {
        console.error('loadAnalysis error', e);
      } finally {
        analysisLoading.value = { ...analysisLoading.value, [vid]: false };
      }
    };

    const onResize = () => {
      for (const vid of Object.keys(charts)) {
        const canvas = document.querySelector(`#chart-${vid}`);
        if (!canvas) continue;
        setCanvasToScreenWidth(canvas);
        try { charts[vid].resize(); } catch (e) { /* ignore */ }
      }
    };

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
        const data = await getTwitchStatus();
        isLive.value = !!data.live;
        platforms.value = data.platforms || (data.platform ? [data.platform] : []);
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
      fetchStreamers();
      window.addEventListener('resize', onResize);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', onResize);
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
      // live
      isLive,
      platforms,
      streamTitle,
      viewerCount,
      thumbnail,
      liveUrl,
      statusChecked,
      avatarUrl,
      vods,
      fetchStreamers,
      analysisMap,
      loadAnalysis,
      analysisLoading,
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
.recording-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease;
}
.rec-title {
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rec-meta {
  color: #777;
  font-size: 0.85rem;
}

.rec-info{
  width: 100%;
}

.rec-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.rec-label {
  font-size: 0.78rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 600;
  text-transform: none;
}

.rec-chart { margin-top: 8px; }
.chart-svg { width: 100%; height: auto; display: block; }
.chart-path { stroke: #3b82f6; }
.rec-chart canvas { width: 100%; height: 80px; }
.btn[disabled] { opacity: 0.6; pointer-events: none; }
</style>
