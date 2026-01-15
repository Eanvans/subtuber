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

      <!-- 高级参数调节 (可折叠) -->
      <section class="advanced-params">
        <div class="advanced-toggle" @click="showAdvanced = !showAdvanced">
          <span class="toggle-icon">{{ showAdvanced ? '▼' : '▶' }}</span>
          <span class="toggle-text">高级参数调节</span>
          <span class="toggle-hint">(调整分析算法参数)</span>
        </div>
        
        <transition name="slide-fade">
          <div v-show="showAdvanced" class="advanced-content">
            <div class="params-grid">
              <div class="param-item">
                <label>
                  <span class="param-label">窗口长度 (s)</span>
                  <span class="param-value">{{ analysisParams.windows_len }}</span>
                </label>
                <input 
                  type="range" 
                  v-model.number="analysisParams.windows_len" 
                  min="60" 
                  max="600" 
                  step="10"
                />
                <div class="param-hint">范围: 60-600秒, 控制分析窗口大小</div>
              </div>

              <div class="param-item">
                <label>
                  <span class="param-label">阈值</span>
                  <span class="param-value">{{ analysisParams.thr.toFixed(2) }}</span>
                </label>
                <input 
                  type="range" 
                  v-model.number="analysisParams.thr" 
                  min="0.5" 
                  max="1.0" 
                  step="0.01"
                />
                <div class="param-hint">范围: 0.50-1.00, 热点检测敏感度阈值</div>
              </div>

              <div class="param-item">
                <label>
                  <span class="param-label">搜索范围 (s)</span>
                  <span class="param-value">{{ analysisParams.search_range }}</span>
                </label>
                <input 
                  type="range" 
                  v-model.number="analysisParams.search_range" 
                  min="30" 
                  max="300" 
                  step="5"
                />
                <div class="param-hint">范围: 30-300秒, 峰值搜索范围</div>
              </div>
            </div>
            <div class="advanced-actions">
              <button class="btn btn-primary" @click="refreshAnalysis" :disabled="refreshing">
                {{ refreshing ? '更新中...' : '应用参数并刷新' }}
              </button>
            </div>
          </div>
        </transition>
      </section>

      <!-- AI分析参数说明 -->
      <div class="ai-params-notice">
        <div class="notice-icon">ℹ️</div>
        <div class="notice-content">
          <div class="notice-title">AI 分析参数说明</div>
          <div class="notice-text">
            当前使用默认参数: 窗口长度 420秒 (7分钟) | 阈值 0.9 (90百分位) | 搜索范围 210秒 (3.5分钟)
          </div>
          <div class="notice-dev">⚠️ 实时更新 AI 总结功能还在开发中</div>
        </div>
      </div>

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
    const platform = ref(route.query.platform || '')
    const loading = ref(true)
    const error = ref('')
    const analysis = ref({})
    const hotMoments = ref([])
    const timeSeriesData = ref([])
    const refreshing = ref(false)
    const showAdvanced = ref(false)
    const analysisParams = ref({
      windows_len: 420,
      thr: 0.90,
      search_range: 210
    })

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

    const fetchAnalysisData = async () => {
      try {
        const data = await getAnalysis(
          videoId, 
          analysisParams.value.windows_len,
          analysisParams.value.thr,
          analysisParams.value.search_range
        )
        analysis.value = data || {}
        hotMoments.value = (data && data.hot_moments) ? data.hot_moments : []
        timeSeriesData.value = (data && data.time_series_data) ? data.time_series_data : []

         // 异步加载每个热点时段的分析摘要
        if (hotMoments.value.length > 0) {
          hotMoments.value.forEach(async (moment, idx) => {
            const offset = moment.offset_seconds ?? moment.offset ?? 0;
            // 为每个moment添加加载状态
            moment.summaryLoading = false;
            moment.summaryError = null;
            moment.summary = null;
            moment.expanded = false;
            
            // 检查是否为YouTube平台
            if (platform.value && platform.value.toLowerCase().includes('youtube')) {
              moment.summary = 'YouTube总结因为Youtube的下载不稳定，暂时没有很好的解决方案，欢迎大佬加群交流和讨论。';
              return;
            }
            
            moment.summaryLoading = true;
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
      }
    }

    const refreshAnalysis = async () => {
      if (refreshing.value) return
      refreshing.value = true
      error.value = ''
      
      try {
        await fetchAnalysisData()
        
        // 重新渲染图表
        if (timeSeriesData.value.length > 0) {
          await nextTick()
          await renderTimeSeriesChart()
        }
      } catch (e) {
        console.error('Refresh analysis error', e)
        error.value = '刷新失败'
      } finally {
        refreshing.value = false
      }
    }

    onMounted(async () => {
      if (!videoId) {
        error.value = '缺少 video_id'
        loading.value = false
        return
      }
       
      await fetchAnalysisData()
      loading.value = false
      
      // 渲染时间序列折线图 - 必须在 loading 为 false 后才能渲染
      if (timeSeriesData.value.length > 0) {
        await nextTick() // 等待 v-else 块渲染完成
        await renderTimeSeriesChart()
      }
    })

    return {
      videoId,
      platform,
      loading,
      error,
      analysis,
      hotMoments,
      timeSeriesData,
      analysisParams,
      refreshing,
      showAdvanced,
      formatOffset,
      intervalRange,
      toggleExpand,
      refreshAnalysis,
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

.ai-params-notice {
  display: flex;
  gap: 0.8rem;
  padding: 1rem 1.2rem;
  margin: 1.5rem 0 1rem 0;
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.1);
}

.notice-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
  line-height: 1;
}

.notice-content {
  flex: 1;
}

.notice-title {
  font-weight: 600;
  color: #1e40af;
  font-size: 0.95rem;
  margin-bottom: 0.4rem;
}

.notice-text {
  font-size: 0.88rem;
  color: #1e3a8a;
  line-height: 1.5;
  margin-bottom: 0.3rem;
}

.notice-dev {
  font-size: 0.85rem;
  color: #92400e;
  font-style: italic;
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

.advanced-params {
  margin: 1.5rem 0;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.advanced-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.2rem;
  cursor: pointer;
  background: #f9fafb;
  transition: background 0.2s;
  user-select: none;
}

.advanced-toggle:hover {
  background: #f3f4f6;
}

.toggle-icon {
  font-size: 0.8rem;
  color: #6b7280;
  width: 16px;
  display: inline-block;
  transition: transform 0.2s;
}

.toggle-text {
  font-weight: 600;
  color: #374151;
  font-size: 0.95rem;
}

.toggle-hint {
  color: #9ca3af;
  font-size: 0.85rem;
  font-style: italic;
}

.advanced-content {
  padding: 1.5rem;
  background: #fafbfc;
  border-top: 1px solid #e5e7eb;
}

.params-grid {
  display: grid;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.param-item label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  color: #1f2937;
}

.param-label {
  font-size: 0.95rem;
}

.param-value {
  font-size: 1rem;
  color: #3b82f6;
  font-weight: 600;
  min-width: 60px;
  text-align: right;
}

.param-item input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;
}

.param-item input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  transition: background 0.2s;
}

.param-item input[type="range"]::-webkit-slider-thumb:hover {
  background: #2563eb;
}

.param-item input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
  transition: background 0.2s;
}

.param-item input[type="range"]::-moz-range-thumb:hover {
  background: #2563eb;
}

.param-hint {
  font-size: 0.85rem;
  color: #6b7280;
  font-style: italic;
}

.advanced-actions {
  margin-top: 1.2rem;
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  box-shadow: none;
}

/* 折叠动画 */
.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

</style>
