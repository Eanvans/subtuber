<template>
  <main class="workspace-width workspace-page">
    <header class="page-header">
      <div>
        <h1>回放热度分析</h1>
        <div class="recording-meta">
          <span v-if="analysis.streamer_name">{{ analysis.streamer_name }}</span>
          <span class="platform-label" :data-platform="platformLabel">{{ platformLabel }}</span>
          <span class="video-id">视频 {{ analysis.video_id || videoId }}</span>
        </div>
      </div>
      <a v-if="vodExternalUrl" :href="vodExternalUrl" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
        查看原视频 <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
      </a>
    </header>

    <div v-if="loading" class="surface analysis-state" role="status">正在加载回放分析…</div>
    <div v-else-if="error" class="surface analysis-state" role="status">
      <p>{{ error }}</p>
      <button type="button" class="btn btn-outline btn-sm" :disabled="refreshing" @click="refreshAnalysis">重新加载</button>
    </div>
    <template v-else>
      <section class="surface time-series-chart" aria-labelledby="trend-title">
        <div class="analysis-header">
          <div>
            <h2 id="trend-title">直播热度趋势</h2>
            <p>按回放时间查看互动得分，编号对应下方的高能片段。</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" @click="showAdvanced = true">
            <i class="bi bi-sliders" aria-hidden="true"></i> 分析参数
          </button>
        </div>
        <div class="chart-legend" aria-hidden="true">
          <span><span class="legend-line"></span> 互动得分</span>
          <span><span class="legend-peak"></span> 高能片段</span>
          <span><span class="legend-local-peak"></span> 热度峰值</span>
        </div>
        <div v-show="timeSeriesData.length" class="chart-container">
          <canvas ref="chartCanvas" role="img" aria-label="直播互动得分随回放时间变化的折线图"></canvas>
        </div>
        <div v-if="!timeSeriesData.length" class="chart-state" role="status">
          {{ seriesLoading ? '正在加载热度数据…' : seriesError || '暂无热度数据' }}
        </div>
      </section>

      <section class="surface hot-moments" aria-labelledby="moments-title">
        <div class="analysis-header">
          <h2 id="moments-title">高能片段</h2>
          <span class="moment-count">{{ hotMoments.length }} 个片段</span>
        </div>
        <div v-if="!hotMoments.length" class="analysis-state">暂无高能片段</div>
        <ol v-else class="moments-list">
          <li v-for="(moment, index) in hotMoments" :key="index" class="moment">
            <div class="moment-meta">
              <span class="moment-index">{{ moment.markerNo }}</span>
              <div>
                <div class="moment-time">{{ intervalRange(moment) }}</div>
                <span class="moment-score">互动得分 <strong>{{ moment.comments_score ?? '—' }}</strong></span>
              </div>
            </div>
            <div class="moment-summary">
              <p v-if="moment.summaryLoading" role="status">正在加载摘要…</p>
              <p v-else-if="moment.summaryError">{{ moment.summaryError }}</p>
              <template v-else-if="moment.summary">
                <p class="summary-text" :class="{ collapsed: moment.summary.length > 90 && !moment.expanded }" :id="`moment-summary-${index}`">{{ moment.summary }}</p>
                <button
                  v-if="moment.summary.length > 90"
                  type="button"
                  class="summary-toggle"
                  :aria-expanded="moment.expanded"
                  :aria-controls="`moment-summary-${index}`"
                  @click="toggleExpand(moment)"
                >{{ moment.expanded ? '收起摘要' : '展开摘要' }}</button>
              </template>
              <p v-else>暂无片段摘要</p>
            </div>
          </li>
        </ol>
      </section>
    </template>

    <transition name="slide-fade">
      <div v-if="showAdvanced" class="advanced-modal-overlay" @click.self="showAdvanced = false">
        <div class="advanced-modal-card" role="dialog" aria-modal="true" aria-labelledby="advanced-title" @keydown.esc="showAdvanced = false">
          <div class="advanced-modal-header">
            <h4 id="advanced-title">分析参数</h4>
            <button type="button" class="modal-close" aria-label="关闭分析参数" @click="showAdvanced = false">×</button>
          </div>
          <div class="advanced-modal-body">
            <div class="params-grid">
              <div class="param-item">
                <label>
                  <span class="param-label">窗口长度 (s)</span>
                  <span class="param-value">{{ analysisParams.windows_len }}</span>
                </label>
                <input
                  v-model.number="analysisParams.windows_len"
                  type="range"
                  aria-label="窗口长度（秒）"
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
                  v-model.number="analysisParams.thr"
                  type="range"
                  aria-label="阈值"
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
                  v-model.number="analysisParams.search_range"
                  type="range"
                  aria-label="搜索范围（秒）"
                  min="30"
                  max="300"
                  step="5"
                />
                <div class="param-hint">范围: 30-300秒, 峰值搜索范围</div>
              </div>
            </div>
          </div>
          <div class="advanced-actions">
            <button class="btn btn-primary" @click="applyAdvancedParams" :disabled="refreshing">
              {{ refreshing ? '更新中...' : '应用参数并刷新' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

  </main>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getAnalysis, getAnalysisSummary } from '../api/streamers'
import { useAuth } from '../composables/useAuth'
import { formatPlatformName } from '../utils/platform'
import Chart from 'chart.js/auto'

export default {
  name: 'RecordingDetail',
  setup() {
    const TIME_SERIES_PAGE_SIZE = 1200
    const MAX_TIME_SERIES_PAGES = 200
    let chartInstance = null
    let summaryLoadVersion = 0
    const route = useRoute()
    const { currentUser } = useAuth()
    const videoId = route.params.video_id
    const platform = ref(route.query.platform || '')
    const loading = ref(true)
    const error = ref('')
    const analysis = ref({})
    const hotMoments = ref([])
    const timeSeriesData = ref([])
    const chartCanvas = ref(null)
    const seriesLoading = ref(false)
    const seriesError = ref('')
    const refreshing = ref(false)
    const showAdvanced = ref(false)
    const analysisParams = ref({
      windows_len: 420,
      thr: 0.90,
      search_range: 210
    })
    const platformLabel = computed(() => formatPlatformName(platform.value || analysis.value.platform || 'twitch'))
    const vodExternalUrl = computed(() => {
      const id = String(analysis.value?.video_id || videoId || '').trim()
      if (!id) return ''
      if (platformLabel.value === 'YouTube') return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`
      if (platformLabel.value === 'Twitch') return `https://www.twitch.tv/videos/${encodeURIComponent(id)}`
      return ''
    })

    const getOffsetSeconds = (item) => {
      const offset = item?.offset_seconds ?? item?.offset
      if (offset == null || offset === '') return null
      const seconds = Number(offset)
      return Number.isFinite(seconds) && seconds >= 0 ? seconds : null
    }

    const buildHotMomentsWithState = (moments) => {
      return [...(moments || [])]
        .sort((a, b) => (getOffsetSeconds(a) ?? Infinity) - (getOffsetSeconds(b) ?? Infinity))
        .map((moment, index) => ({
          ...moment,
          markerNo: index + 1,
          summaryLoading: false,
          summaryError: null,
          summary: null,
          expanded: false
        }))
    }

    const getMomentMarkers = (series, moments) => {
      const numberByOffset = new Map()
      for (const moment of moments) {
        const offset = getOffsetSeconds(moment)
        if (offset !== null) numberByOffset.set(offset, moment.markerNo)
      }

      const markerByIndex = new Map()
      series.forEach((point, index) => {
        const offset = getOffsetSeconds(point)
        if (numberByOffset.has(offset)) markerByIndex.set(index, numberByOffset.get(offset))
      })
      return markerByIndex
    }

    const loadMomentSummariesSequentially = async (moments, version) => {
      const isYoutube = platform.value && platform.value.toLowerCase().includes('youtube')
      const userHash = currentUser.value
        ? (currentUser.value.userId || currentUser.value.user_id || currentUser.value.userHash || currentUser.value.user_hash || currentUser.value.hash || currentUser.value.id || null)
        : null

      for (const moment of moments) {
        if (version !== summaryLoadVersion) return

        if (isYoutube) {
          moment.summary = 'YouTube 回放的摘要暂不可用。'
          continue
        }

        const offset = moment.offset_seconds ?? moment.offset ?? 0
        moment.summaryLoading = true
        try {
          const summary = await getAnalysisSummary(videoId, offset, userHash)
          if (version !== summaryLoadVersion) return
          moment.summary = summary
        } catch (err) {
          if (version !== summaryLoadVersion) return
          console.error(`加载摘要失败 (offset: ${offset})`, err)
          moment.summaryError = '片段摘要加载失败'
        } finally {
          if (version === summaryLoadVersion) {
            moment.summaryLoading = false
          }
        }
      }
    }

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

    const renderTimeSeriesChart = () => {
      const canvas = chartCanvas.value
      if (!canvas || timeSeriesData.value.length === 0) return

      const series = timeSeriesData.value
      const labels = series.map((p) => p.formatted_time || formatOffset(getOffsetSeconds(p)))
      const values = series.map((p) => p.score ?? 0)
      // Adjacent samples on a flat peak can all be flagged by the API.
      // Number the merged moments at their timestamps, including on a curve drawn with custom parameters.
      const markerByIndex = getMomentMarkers(series, hotMoments.value)
      const momentColor = '#bd501b'
      const pointBg = series.map((_, index) => markerByIndex.has(index) ? momentColor : '#a4a7e6')
      const pointRadii = series.map((point, index) => {
        if (markerByIndex.has(index)) return 4
        return point.is_peak ? 2 : 0
      })

      if (chartInstance) {
        chartInstance.destroy()
      }

      const ctx = canvas.getContext('2d')
      const peakMarkerNumberPlugin = {
        id: 'peakMarkerNumber',
        afterDatasetsDraw(chart) {
          const datasetMeta = chart.getDatasetMeta(0)
          if (!datasetMeta?.data?.length) return
          const chartCtx = chart.ctx
          chartCtx.save()
          chartCtx.font = '700 12px system-ui, -apple-system, Segoe UI, sans-serif'
          chartCtx.textAlign = 'center'
          chartCtx.textBaseline = 'bottom'
          chartCtx.strokeStyle = '#ffffff'
          chartCtx.lineWidth = 3

          for (const [index, number] of markerByIndex) {
            const { x, y, skip } = datasetMeta.data[index]
            if (skip) continue
            chartCtx.fillStyle = momentColor
            chartCtx.beginPath()
            chartCtx.arc(x, y, 4, 0, Math.PI * 2)
            chartCtx.fill()
            chartCtx.fillStyle = '#97421b'
            chartCtx.strokeText(String(number), x, y - 10)
            chartCtx.fillText(String(number), x, y - 10)
          }
          chartCtx.restore()
        }
      }

      chartInstance = new Chart(ctx, {
        plugins: [peakMarkerNumberPlugin],
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: '互动得分',
            data: values,
            borderColor: '#4b4fcb',
            borderWidth: 2,
            backgroundColor: 'rgba(75, 79, 203, .09)',
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
          layout: { padding: { top: 16 } },
          scales: {
            x: {
              type: 'category',
              ticks: {
                maxRotation: 0,
                autoSkip: true,
                autoSkipPadding: 20,
                color: '#5c6b82',
                font: { size: 11 },
                padding: 6,
              },
              grid: { display: false },
            },
            y: {
              beginAtZero: true,
              ticks: { color: '#5c6b82', precision: 0 },
              grid: { color: '#e9edf5' },
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
                  const marker = markerByIndex.get(idx)
                  if (marker !== undefined) return `互动得分 ${v} · 高能片段 ${marker}`
                  const peak = series[idx] && series[idx].is_peak ? ' · 热度峰值' : ''
                  return `互动得分 ${v}${peak}`
                }
              }
            },
          },
        },
      })
    }

    const loadTimeSeriesPaged = async (version, windowsLen, thr, searchRange) => {
      try {
        const mergedSeries = []
        let offset = 0

        for (let page = 0; page < MAX_TIME_SERIES_PAGES; page += 1) {
          if (version !== summaryLoadVersion) return
          const pageData = await getAnalysis(
            videoId,
            windowsLen,
            thr,
            searchRange,
            {
              includeTimeSeries: true,
              timeSeriesOffset: offset,
              timeSeriesLimit: TIME_SERIES_PAGE_SIZE
            }
          )
          if (version !== summaryLoadVersion) return
          const chunk = Array.isArray(pageData?.time_series_data) ? pageData.time_series_data : []
          if (!chunk.length) break

          mergedSeries.push(...chunk)
          if (chunk.length < TIME_SERIES_PAGE_SIZE) break
          offset += chunk.length
        }

        if (version !== summaryLoadVersion) return
        timeSeriesData.value = mergedSeries
        if (timeSeriesData.value.length > 0) {
          await nextTick()
          if (version === summaryLoadVersion) renderTimeSeriesChart()
        }
      } catch (seriesErr) {
        if (version !== summaryLoadVersion) return
        timeSeriesData.value = []
        console.error('获取热度数据失败', seriesErr)
        seriesError.value = '热度数据加载失败，可重新应用分析参数。'
      } finally {
        if (version === summaryLoadVersion) seriesLoading.value = false
      }
    }

    const fetchAnalysisData = async () => {
      try {
        const version = ++summaryLoadVersion
        const windowsLen = analysisParams.value.windows_len
        const thr = analysisParams.value.thr
        const searchRange = analysisParams.value.search_range

        const data = await getAnalysis(
          videoId, 
          windowsLen,
          thr,
          searchRange,
          { includeTimeSeries: false }
        )
        if (version !== summaryLoadVersion) return

        analysis.value = data || {}
        hotMoments.value = buildHotMomentsWithState((data && data.hot_moments) ? data.hot_moments : [])
        timeSeriesData.value = []
        seriesError.value = ''
        seriesLoading.value = true
        loading.value = false
        if (chartInstance) {
          chartInstance.destroy()
          chartInstance = null
        }

        if (hotMoments.value.length > 0) {
          void loadMomentSummariesSequentially(hotMoments.value, version)
        }
        void loadTimeSeriesPaged(version, windowsLen, thr, searchRange)
      } catch (e) {
        console.error('RecordingDetail getAnalysis error', e)
        error.value = '回放分析加载失败，请重试。'
      }
    }

    const refreshAnalysis = async () => {
      if (refreshing.value) return
      refreshing.value = true
      error.value = ''
      
      try {
        await fetchAnalysisData()
      } catch (e) {
        console.error('Refresh analysis error', e)
        error.value = '刷新失败'
      } finally {
        refreshing.value = false
      }
    }

    const applyAdvancedParams = async () => {
      await refreshAnalysis()
      if (!error.value) {
        showAdvanced.value = false
      }
    }

    onMounted(async () => {
      await fetchAnalysisData()
      loading.value = false
    })

    onBeforeUnmount(() => {
      summaryLoadVersion += 1
      if (chartInstance) {
        chartInstance.destroy()
        chartInstance = null
      }
    })

    return {
      videoId,
      platformLabel,
      loading,
      error,
      analysis,
      hotMoments,
      timeSeriesData,
      analysisParams,
      refreshing,
      showAdvanced,
      vodExternalUrl,
      chartCanvas,
      seriesLoading,
      seriesError,
      intervalRange,
      toggleExpand,
      refreshAnalysis,
      applyAdvancedParams
    }
  }
}
</script>

<style scoped>
.recording-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .45rem .7rem;
  margin-top: .55rem;
  color: var(--muted-2);
  font-size: .84rem;
}
.video-id { overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.analysis-state { color: var(--muted-2); text-align: center; padding: 2.8rem 1rem; font-size: .86rem; }
.analysis-state p { margin: 0 0 .65rem; }
.time-series-chart { padding: 1.15rem 1.25rem; margin-bottom: 1.2rem; }
.analysis-header { display: flex; align-items: center; justify-content: space-between; gap: .8rem; }
.analysis-header h2 { margin: 0; font-size: 1.17rem; }
.analysis-header p { margin: .35rem 0 0; color: var(--muted-2); font-size: .82rem; line-height: 1.55; }
.analysis-header button { flex-shrink: 0; }
.chart-legend { display: flex; flex-wrap: wrap; align-items: center; gap: .85rem; margin: .8rem 0 .65rem; color: var(--muted-2); font-size: .73rem; }
.chart-legend > span { display: inline-flex; align-items: center; gap: .4rem; }
.legend-line { width: 18px; height: 2px; border-radius: 2px; background: var(--accent); }
.legend-peak { width: 8px; height: 8px; border-radius: 50%; background: #bd501b; }
.legend-local-peak { width: 6px; height: 6px; border-radius: 50%; background: #a4a7e6; }
.chart-container { position: relative; height: clamp(225px, 26vw, 340px); }
.chart-state { min-height: 180px; display: grid; place-items: center; color: var(--muted-2); font-size: .85rem; }
.hot-moments .analysis-header { padding: 1rem 1.25rem; }
.moment-count { color: var(--muted-2); font-size: .8rem; white-space: nowrap; }
.moments-list { margin: 0; padding: 0; list-style: none; }
.moment {
  display: grid;
  grid-template-columns: minmax(150px, .7fr) minmax(0, 2.2fr);
  gap: .75rem 1.2rem;
  padding: .95rem 1.25rem;
  border-top: 1px solid var(--border);
}
.moment-meta { display: flex; align-items: flex-start; gap: .55rem; }
.moment-time { color: var(--text); font-size: .88rem; font-variant-numeric: tabular-nums; font-weight: 700; }
.moment-index {
  display: grid;
  place-items: center;
  min-width: 23px;
  height: 23px;
  padding: 0 .2rem;
  border-radius: 6px;
  color: #97421b;
  background: #fff0e6;
  font-size: .72rem;
  font-weight: 750;
}
.moment-score { color: var(--muted-2); font-size: .76rem; font-variant-numeric: tabular-nums; }
.moment-summary { min-width: 0; }
.moment-summary p { margin: 0; color: var(--muted); font-size: .85rem; line-height: 1.65; overflow-wrap: anywhere; }
.summary-text { white-space: pre-wrap; }
.summary-text.collapsed { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.summary-toggle { background: none; color: var(--accent); border: 0; padding: 0; margin-top: .25rem; font-size: .78rem; cursor: pointer; }
.summary-toggle:hover { text-decoration: underline; }

@media (max-width: 560px) {
  .moment { grid-template-columns: 1fr; }
  .time-series-chart, .hot-moments .analysis-header, .moment { padding-inline: .85rem; }
  .time-series-chart .analysis-header { align-items: flex-start; }
}

.advanced-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 1rem;
}

.advanced-modal-card {
  width: 100%;
  max-width: 520px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.advanced-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1.1rem;
  border-bottom: 1px solid #e5e7eb;
}

.advanced-modal-header h4 {
  margin: 0;
  font-size: 1rem;
  color: #111827;
}

.modal-close {
  border: none;
  background: transparent;
  font-size: 1.3rem;
  color: #6b7280;
  cursor: pointer;
  line-height: 1;
}

.advanced-modal-body {
  padding: 1rem 1.1rem;
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
  color: var(--accent);
  font-weight: 600;
  min-width: 60px;
  text-align: right;
}

.param-item input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  -webkit-appearance: none;
}

.param-item input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  transition: background 0.2s;
}

.param-item input[type="range"]::-webkit-slider-thumb:hover {
  background: var(--accent-hover);
}

.param-item input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: none;
  transition: background 0.2s;
}

.param-item input[type="range"]::-moz-range-thumb:hover {
  background: var(--accent-hover);
}

.param-hint {
  font-size: 0.85rem;
  color: #6b7280;
  font-style: italic;
}

.advanced-actions {
  margin-top: 0.2rem;
  padding: 0 1.1rem 1.1rem;
  display: flex;
  justify-content: flex-end;
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
