<template>
  <div class="recording-detail card" style="max-width: 960px; margin: 1rem auto; width: 100%;">
    <button class="btn btn-ghost" @click="$router.back()">← 返回</button>
    <h2 style="margin-top: 0.5rem;">直播热点时段</h2>
    <div v-if="loading">加载中…</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <div class="meta-row">
        <div><strong>VOD ID:</strong> {{ analysis.video_id || videoId }}</div>
        <div><strong>主播:</strong> {{ analysis.streamer_name || '-' }}</div>
      </div>

      <!-- 时间序列折线图 -->
      <section class="time-series-chart">
        <h3>直播热度趋势</h3>
        <div class="chart-container">
          <canvas id="timeSeriesChart" style="width:100%; height:100%"></canvas>
        </div>
      </section>

      <section class="hot-moments">
        <div v-if="!hotMoments.length">没有可展示的片段。</div>
        <div class="moments-list">
          <div class="moment" v-for="(m, idx) in hotMoments" :key="idx">
            <div class="moment-left">
              <div class="time">{{ intervalRange(m) }}</div>
              <div class="interval">{{ m.time_interval || '' }}</div>
              <div><strong>热点得分:</strong> {{ m.comments_score }}</div>
            </div>
            <div class="moment-right">
              <!-- Placeholder area for AI analysis / clip preview -->
              <div 
                class="moment-preview" 下·
                :class="{ loading: m.summaryLoading, expanded: m.expanded, clickable: m.summary && !m.summaryLoading }"
                @click="m.summary && !m.summaryLoading && toggleExpand(m)"
              >
                <div v-if="m.summaryLoading" class="loading-text">加载分析中...</div>
                <div v-else-if="m.summaryError" class="error-text">{{ m.summaryError }}</div>
                <div v-else-if="m.summary" class="summary-text">{{ m.summary }}</div>
                <div v-else class="placeholder-text">内容占位：AI 分析输出将显示在这里（占位灰色框）</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAnalysis, getAnalysisSummary } from '../api/streamers'
import Chart from 'chart.js/auto'

export default {
  setup() {
    let chartInstance = null
    const route = useRoute()
    const router = useRouter()
    const videoId = route.params.video_id
    const loading = ref(true)
    const error = ref('')
    const analysis = ref({})
    const hotMoments = ref([])
    const timeSeriesData = ref([])

    const formatOffset = (sec) => {
      if (sec == null || isNaN(sec)) return ''
      const m = Math.floor(sec / 60)
      const s = Math.floor(sec % 60)
      return `${m}:${String(s).padStart(2, '0')}`
    }

    const parseIntervalSeconds = (ti) => {
      if (!ti) return 0
      const str = String(ti).trim().toLowerCase()
      // match patterns like "7min", "7 min", "30s"
      const m = str.match(/(\d+)\s*(min|m|minute|minutes|s|sec|secs|second|seconds)?/i)
      if (!m) return 0
      const val = parseInt(m[1], 10) || 0
      const unit = (m[2] || '').toLowerCase()
      if (!unit || unit.startsWith('m')) return val * 60
      if (unit.startsWith('s')) return val
      return val * 60
    }

    const formatSeconds = (sec) => {
      if (sec == null || isNaN(sec)) return ''
      const s = Math.max(0, Math.floor(sec))
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const ss = s % 60
      if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
      return `${m}:${String(ss).padStart(2, '0')}`
    }

    const intervalRange = (m) => {
      const off = (m && (m.offset_seconds ?? m.offset)) ? (m.offset_seconds ?? m.offset) : 0
      const ti = (m && m.time_interval) ? m.time_interval : ''
      const len = parseIntervalSeconds(ti)
      if (!len) return (m && (m.formatted_time || formatOffset(off))) || ''
      const half = Math.floor(len / 2)
      const start = Math.max(0, off - half)
      const end = off + (len - half)
      return `${formatSeconds(start)} - ${formatSeconds(end)}`
    }

    const toggleExpand = (moment) => {
      moment.expanded = !moment.expanded
    }

    const renderTimeSeriesChart = async () => {
      const canvas = document.getElementById('timeSeriesChart')
      console.log('Rendering chart on canvas:', canvas, 'timeSeriesData length:', timeSeriesData.value.length)
      if (!canvas || timeSeriesData.value.length === 0) return

      const series = timeSeriesData.value
      const labels = series.map((p) => p.formatted_time || formatOffset(p.offset_seconds))
      const values = series.map((p) => p.score ?? 0)
      const pointBg = series.map((p) => p.is_peak ? '#ef4444' : '#3b82f6')
      const pointRadii = series.map((p) => p.is_peak ? 6 : 2)

      if (chartInstance) {
        chartInstance.destroy()
      }

      const ctx = canvas.getContext('2d')
      const canvasWidth = canvas.clientWidth || 800
      const approxLabelWidth = 100
      const maxTicksLimit = Math.max(2, Math.floor(canvasWidth / approxLabelWidth))
      const step = Math.max(1, Math.ceil(labels.length / maxTicksLimit))

      chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Score',
            data: values,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.08)',
            tension: 0.3,
            pointRadius: pointRadii,
            pointBackgroundColor: pointBg,
            pointHoverRadius: 7,
            fill: true,
          }],
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
                  return (idx % step === 0) ? (labels[idx] || '') : ''
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
                title: (items) => items && items[0] ? items[0].label : '',
                label: (ctx) => {
                  const v = ctx.parsed.y
                  const idx = ctx.dataIndex
                  const peak = series[idx] && series[idx].is_peak ? ' (peak)' : ''
                  return `Score: ${v}${peak}`
                }
              }
            },
          },
        },
      })
    }

    onMounted(async () => {
      if (!videoId) {
        error.value = '缺少 video_id'
        loading.value = false
        return
      }
       
      try {
        const data = await getAnalysis(videoId)
        analysis.value = data || {}
        hotMoments.value = (data && data.hot_moments) ? data.hot_moments : []
        timeSeriesData.value = (data && data.time_series_data) ? data.time_series_data : []

         // 异步加载每个热点时段的分析摘要
        if (hotMoments.value.length > 0) {
          hotMoments.value.forEach(async (moment, idx) => {
            const offset = moment.offset_seconds ?? moment.offset ?? 0;
            // 为每个moment添加加载状态
            moment.summaryLoading = true;
            moment.summaryError = null;
            moment.summary = null;
            moment.expanded = false;
            
            try {
              const summary = await getAnalysisSummary(videoId, offset);
              moment.summary = summary;
            } catch (err) {
              console.error(`加载摘要失败 (offset: ${offset})`, err);
              moment.summaryError = '加载失败';
            } finally {
              moment.summaryLoading = false;
            }
          });
        }
      } catch (e) {
        console.error('RecordingDetail getAnalysis error', e)
        error.value = '加载失败'
      } finally {
        loading.value = false
        
        // 渲染时间序列折线图 - 必须在 loading 为 false 后才能渲染
        if (timeSeriesData.value.length > 0) {
          await nextTick() // 等待 v-else 块渲染完成
          await renderTimeSeriesChart()
        }
      }
    })

    return {
      videoId,
      loading,
      error,
      analysis,
      hotMoments,
      timeSeriesData,
      formatOffset,
      intervalRange,
      toggleExpand,
      router,
    }
  }
}
</script>

<style scoped>
.meta-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  color: var(--muted);
}

.time-series-chart {
  margin: 1.5rem 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.time-series-chart h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
}

.chart-container {
  height: 200px;
  position: relative;
}

.moments-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.moment {
  display: flex;
  gap: 12px;
  background: #fff;
  padding: 10px;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.moment-left {
  flex: 0 0 28%;
  min-width: 150px;
}

.moment-right {
  flex: 1;
  max-width: 70%;
}

.moment-preview {
  min-height: 120px;
  max-height: 120px;
  width: 100%;
  background: #f3f4f6;
  border-radius: 6px;
  margin-top: 8px;
  padding: 10px;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: max-height 0.3s ease;
  position: relative;
}

.moment-preview.expanded {
  max-height: none;
}

.moment-preview.clickable {
  cursor: pointer;
}

.moment-preview.clickable:hover {
  background: #e5e7eb;
}

.moment-preview.loading {
  background: #fef3c7;
}

.loading-text {
  color: #92400e;
  font-style: italic;
}

.error-text {
  color: #dc2626;
}

.summary-text {
  color: #374151;
  text-align: left;
  width: 100%;
  white-space: pre-wrap;
}

.placeholder-text {
  color: #6b7280
}

.time {
  font-weight: 700;
  font-size: 1rem
}

.interval {
  color: #666;
  font-size: 0.9rem
}


</style>
