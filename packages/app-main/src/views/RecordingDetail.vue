<template>
  <div class="recording-detail-page">
    <div class="recording-layout">
      <SubscriptionSidebar
        title="我的订阅"
        :items="subscriptions"
        :loading="subscriptionsLoading"
        empty-text="暂时还没有订阅主播"
        :active-id="activeSubscriptionId"
        :show-add-button="true"
        @add-click="openStartExploreModal"
      />

      <section ref="contentPanelRef" class="content-panel" @scroll="handleContentScroll">
        <div v-if="loading" class="status-block">加载中…</div>
        <div v-else-if="error" class="status-block error">{{ error }}</div>
        <div v-else>
          <div class="meta-row">
            <div>
              <strong>VOD ID:</strong>
              <a
                v-if="vodExternalUrl"
                :href="vodExternalUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="vod-link"
              >
                {{ analysis.video_id || videoId }}
              </a>
              <span v-else>{{ analysis.video_id || videoId }}</span>
            </div>
            <div><strong>主播:</strong> {{ analysis.streamer_name || '-' }}</div>
          </div>

          <section class="time-series-chart" :style="timeSeriesChartStyle">
            <div class="chart-header">
              <h3>直播热度趋势</h3>
              <button class="btn-advanced" @click="showAdvanced = true">高级参数调节</button>
            </div>
            <div class="chart-container">
              <canvas id="timeSeriesChart" style="width:100%; height:100%"></canvas>
            </div>
          </section>

          <section class="hot-moments">
            <div v-if="!hotMoments.length">没有可展示的片段。</div>
            <div class="moments-list">
              <div v-for="(m, idx) in hotMoments" :key="idx" class="moment">
                <div class="moment-left">
                  <div class="time">
                    <span v-if="markerAssignmentReady && m.markerNo != null" class="moment-index">{{ m.markerNo }}.</span>
                    {{ intervalRange(m) }}
                  </div>
                  <!-- <div class="interval">{{ m.time_interval || '' }}</div> -->
                  <div><strong>得分:</strong> {{ m.comments_score }}</div>
                </div>
                <div class="moment-right">
                  <div
                    class="moment-preview"
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
      </section>
    </div>

    <transition name="slide-fade">
      <div v-if="showAdvanced" class="advanced-modal-overlay" @click.self="showAdvanced = false">
        <div class="advanced-modal-card">
          <div class="advanced-modal-header">
            <h4>高级参数调节</h4>
            <button class="modal-close" @click="showAdvanced = false">×</button>
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

    <StartExploreModal
      v-if="showStartExploreModal"
      @close="showStartExploreModal = false"
      @add-streamer="handleAddStreamer"
    />
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getAnalysis, getAnalysisSummary, subscribeStreamer } from '../api/streamers'
import { useAuth } from '../composables/useAuth'
import StartExploreModal from '../components/StartExploreModal.vue'
import SubscriptionSidebar from '../components/SubscriptionSidebar.vue'
import Chart from 'chart.js/auto'

export default {
  name: 'RecordingDetail',
  components: {
    StartExploreModal,
    SubscriptionSidebar
  },
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
    const peakMarkerByIndex = ref({})
    const markerAssignmentReady = ref(false)
    const contentPanelRef = ref(null)
    const chartScale = ref(1)
    const refreshing = ref(false)
    const showAdvanced = ref(false)
    const subscriptions = ref([])
    const subscriptionsLoading = ref(false)
    const showStartExploreModal = ref(false)
    const analysisParams = ref({
      windows_len: 420,
      thr: 0.90,
      search_range: 210
    })
    const activeSubscriptionId = computed(() => {
      const byQuery = String(route.query.streamer_id || '')
      if (byQuery) return byQuery
      const byAnalysis = analysis.value?.streamer_id || analysis.value?.streamer_login || ''
      return byAnalysis ? String(byAnalysis) : ''
    })
    const vodExternalUrl = computed(() => {
      const id = String(analysis.value?.video_id || videoId || '').trim()
      if (!id) return ''
      return `https://www.twitch.tv/videos/${encodeURIComponent(id)}`
    })
    const timeSeriesChartStyle = computed(() => ({
      transform: `scale(${chartScale.value})`
    }))

    const handleContentScroll = () => {
      const scroller = contentPanelRef.value
      if (!scroller) return
      const progress = Math.min(1, Math.max(0, scroller.scrollTop / 420))
      chartScale.value = 1 - progress * 0.5
    }

    const buildHotMomentsWithState = (moments) => {
      return (moments || []).map((moment) => ({
        ...moment,
        markerNo: null,
        summaryLoading: false,
        summaryError: null,
        summary: null,
        expanded: false
      }))
    }

    const getOffsetSeconds = (item) => {
      const offset = item?.offset_seconds ?? item?.offset
      return Number.isFinite(Number(offset)) ? Number(offset) : 0
    }

    const assignMarkerNumbersAfterSeriesLoaded = (series, moments) => {
      const peakIndices = []
      for (let i = 0; i < series.length; i += 1) {
        if (series[i]?.is_peak) peakIndices.push(i)
      }

      const candidates = (moments || []).map((moment) => ({
        moment,
        offset: getOffsetSeconds(moment)
      }))
      const usedCandidateIndexes = new Set()
      const markerByPeakIndex = {}
      let markerNo = 0

      for (const peakIndex of peakIndices) {
        const peakOffset = getOffsetSeconds(series[peakIndex])
        let bestCandidateIndex = -1
        let bestDiff = Number.POSITIVE_INFINITY

        for (let i = 0; i < candidates.length; i += 1) {
          if (usedCandidateIndexes.has(i)) continue
          const diff = Math.abs(candidates[i].offset - peakOffset)
          if (diff < bestDiff) {
            bestDiff = diff
            bestCandidateIndex = i
          }
        }

        if (bestCandidateIndex >= 0) {
          usedCandidateIndexes.add(bestCandidateIndex)
          markerNo += 1
          markerByPeakIndex[peakIndex] = markerNo
          candidates[bestCandidateIndex].moment.markerNo = markerNo
        }
      }

      return markerByPeakIndex
    }

    const loadMomentSummariesSequentially = async (moments, version) => {
      const isYoutube = platform.value && platform.value.toLowerCase().includes('youtube')
      const userHash = currentUser.value
        ? (currentUser.value.userId || currentUser.value.user_id || currentUser.value.userHash || currentUser.value.user_hash || currentUser.value.hash || currentUser.value.id || null)
        : null

      for (const moment of moments) {
        if (version !== summaryLoadVersion) return

        if (isYoutube) {
          moment.summary = 'YouTube总结因为Youtube的下载不稳定，暂时没有很好的解决方案，欢迎大佬加群交流和讨论。'
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
          moment.summaryError = '加载失败'
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

    const renderTimeSeriesChart = async () => {
      const canvas = document.getElementById('timeSeriesChart')
      if (!canvas || timeSeriesData.value.length === 0) return

      const series = timeSeriesData.value
      const labels = series.map((p) => p.formatted_time || formatOffset(p.offset_seconds))
      const values = series.map((p) => p.score ?? 0)
      const pointBg = series.map((p) => p.is_peak ? '#ef4444' : '#3b82f6')
      const pointRadii = series.map((p) => p.is_peak ? 6 : 2)
      const markerByPeakIndex = peakMarkerByIndex.value

      if (chartInstance) {
        chartInstance.destroy()
      }

      const ctx = canvas.getContext('2d')
      const canvasWidth = canvas.clientWidth || 800
      const approxLabelWidth = 100
      const maxTicksLimit = Math.max(2, Math.floor(canvasWidth / approxLabelWidth))
      const step = Math.max(1, Math.ceil(labels.length / maxTicksLimit))
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

          for (let i = 0; i < datasetMeta.data.length; i += 1) {
            if (!markerAssignmentReady.value) break
            const markerNo = markerByPeakIndex[i]
            if (!markerNo) continue
            const point = datasetMeta.data[i]
            const x = point.x
            const y = point.y - 10
            chartCtx.strokeStyle = '#ffffff'
            chartCtx.lineWidth = 3
            chartCtx.strokeText(String(markerNo), x, y)
            chartCtx.fillStyle = '#dc2626'
            chartCtx.fillText(String(markerNo), x, y)
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
        peakMarkerByIndex.value = assignMarkerNumbersAfterSeriesLoaded(mergedSeries, hotMoments.value)
        markerAssignmentReady.value = true
        if (timeSeriesData.value.length > 0) {
          await nextTick()
          await renderTimeSeriesChart()
        }
      } catch (seriesErr) {
        if (version !== summaryLoadVersion) return
        console.error('RecordingDetail loadTimeSeriesPaged error', seriesErr)
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
        markerAssignmentReady.value = false
        peakMarkerByIndex.value = {}
        timeSeriesData.value = []
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
        error.value = '加载失败'
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

    const fetchSubscriptions = async () => {
      if (!currentUser.value) {
        subscriptions.value = []
        subscriptionsLoading.value = false
        return
      }

      subscriptionsLoading.value = true
      try {
        const response = await fetch('/api/user/subscriptions')
        if (!response.ok) {
          throw new Error('获取订阅列表失败')
        }
        const data = await response.json()
        subscriptions.value = data?.streamers || []
      } catch (e) {
        console.error('获取订阅主播列表失败:', e)
        subscriptions.value = []
      } finally {
        subscriptionsLoading.value = false
      }
    }

    const openStartExploreModal = () => {
      if (!currentUser.value) {
        error.value = '请先登录后使用订阅功能'
        return
      }
      showStartExploreModal.value = true
    }

    const handleAddStreamer = async (streamerData) => {
      try {
        await subscribeStreamer(streamerData)
        await fetchSubscriptions()
        showStartExploreModal.value = false
      } catch (e) {
        console.error('添加主播失败:', e)
        error.value = e.message || '添加主播失败，请稍后重试'
      }
    }

    const handleLoginSuccess = () => {
      fetchSubscriptions()
    }

    onMounted(async () => {
      if (!videoId) {
        error.value = '缺少 video_id'
        loading.value = false
        return
      }

      await Promise.all([
        fetchAnalysisData(),
        fetchSubscriptions()
      ])
      loading.value = false

      window.addEventListener('login-success', handleLoginSuccess)
      handleContentScroll()
    })

    onBeforeUnmount(() => {
      summaryLoadVersion += 1
      if (chartInstance) {
        chartInstance.destroy()
        chartInstance = null
      }
      window.removeEventListener('login-success', handleLoginSuccess)
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
      subscriptions,
      subscriptionsLoading,
      showStartExploreModal,
      activeSubscriptionId,
      vodExternalUrl,
      markerAssignmentReady,
      contentPanelRef,
      timeSeriesChartStyle,
      handleContentScroll,
      formatOffset,
      intervalRange,
      toggleExpand,
      refreshAnalysis,
      applyAdvancedParams,
      openStartExploreModal,
      handleAddStreamer
    }
  }
}
</script>

<style scoped>
.recording-detail-page {
  --sidebar-width: 280px;
  --panel-height: 80vh;
  --sidebar-height: var(--panel-height);
  padding: 1rem;
}

.recording-layout {
  max-width: 1300px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  gap: 1rem;
}

.content-panel {
  background: var(--card, #fff);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  height: var(--panel-height);
  overflow-y: auto;
}

.page-title {
  margin: 0.5rem 0 0;
}

.status-block {
  margin-top: 1rem;
}

.meta-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  color: var(--muted);
}

.vod-link {
  margin-left: 0.35rem;
  color: #2563eb;
  text-decoration: none;
}

.vod-link:hover {
  text-decoration: underline;
}

.time-series-chart {
  margin: 1.5rem 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 20;
  transform-origin: left top;
  transition: transform 0.1s linear;
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
  margin: 0;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.btn-advanced {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
}

.btn-advanced:hover {
  border-color: #3b82f6;
  color: #2563eb;
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
  font-size: 1rem;
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.moment-index {
  color: #dc2626;
  font-weight: 800;
}

.interval {
  color: #666;
  font-size: 0.9rem;
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
  margin-top: 0.2rem;
  padding: 0 1.1rem 1.1rem;
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

@media (max-width: 1024px) {
  .recording-layout {
    grid-template-columns: 1fr;
  }

  .recording-detail-page {
    --panel-height: auto;
    --sidebar-height: auto;
  }

  .content-panel {
    height: auto;
    overflow: visible;
  }
}

</style>
