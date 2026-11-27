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
            <p>互动得分按分钟汇总，编号对应已解锁的片段报告。</p>
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
    </template>

    <section class="surface hot-moments" aria-labelledby="moments-title" :aria-busy="reportsLoading">
      <div class="analysis-header">
        <div>
          <h2 id="moments-title">高能片段</h2>
        </div>
        <span v-if="!reportsLoading && !reportsError" class="moment-count">{{ hotMoments.length }} 份报告</span>
      </div>
      <div v-if="reportsLoading && !hotMoments.length" class="analysis-state" role="status">正在加载片段报告…</div>
      <div v-else-if="reportsError" class="analysis-state" role="status">
        <p>{{ reportsError }}</p>
        <button type="button" class="btn btn-outline btn-sm" @click="fetchReports">重新加载</button>
      </div>
      <div v-else-if="!hotMoments.length" class="analysis-state">暂无片段报告</div>
      <ol v-else class="moments-list">
        <li v-for="moment in hotMoments" :key="moment.id" class="moment">
          <ClipReportDetailCard :report="moment" @unlock="openUnlockDialog(moment)" @request-login="$emit('request-login')" />
        </li>
      </ol>
    </section>

    <dialog ref="unlockDialog" class="workspace-dialog" aria-labelledby="recording-unlock-title" @click.self="closeUnlockDialog" @cancel="handleUnlockCancel">
      <div v-if="activeReport" class="workspace-dialog-content">
        <button type="button" class="workspace-dialog-close" aria-label="关闭解锁弹窗" :disabled="unlockBusy" @click="closeUnlockDialog">×</button>
        <header class="workspace-dialog-header">
          <h2 id="recording-unlock-title">解锁片段</h2>
          <p v-if="unlockPrice !== null">确认后将扣除 {{ unlockPrice }} 积分，永久解锁片段起止时间和互动得分。</p>
          <p v-else-if="unlockBusy" role="status">正在获取解锁价格…</p>
        </header>
        <p v-if="unlockError" class="workspace-dialog-error" role="alert">{{ unlockError }}</p>
        <footer class="workspace-dialog-actions">
          <RouterLink v-if="unlockNeedsRecharge" :to="{ name: 'recharge' }" class="btn btn-outline" @click="closeUnlockDialog">去充值</RouterLink>
          <button type="button" class="btn btn-outline" autofocus :disabled="unlockBusy" @click="closeUnlockDialog">取消</button>
          <button v-if="unlockPrice !== null" type="button" class="btn btn-primary" :disabled="unlockBusy" @click="confirmUnlock">
            {{ unlockBusy ? '正在解锁…' : `确认支付 ${unlockPrice} 积分` }}
          </button>
          <button v-else type="button" class="btn btn-primary" :disabled="unlockBusy" @click="loadUnlockQuote">重新获取报价</button>
        </footer>
      </div>
    </dialog>

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
import { ref, onMounted, onBeforeUnmount, nextTick, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getAnalysis, getRecordingClipReports, getClipReportUnlockQuote, unlockClipReport } from '../api/streamers'
import { useAuth } from '../composables/useAuth'
import { usePointsWallet } from '../composables/usePointsWallet'
import { formatPlatformName } from '../utils/platform'
import { showNotification } from '../utils/notification'
import ClipReportDetailCard from '../components/ClipReportDetailCard.vue'
import Chart from 'chart.js/auto'

export default {
  name: 'RecordingDetail',
  components: { ClipReportDetailCard },
  emits: ['request-login'],
  setup(_, { emit }) {
    const TIME_SERIES_PAGE_SIZE = 1200
    const MAX_TIME_SERIES_PAGES = 200
    let chartInstance = null
    let analysisRequest = 0
    let reportsRequest = 0
    const route = useRoute()
    const { currentUser } = useAuth()
    const { refreshWallet } = usePointsWallet()
    const videoId = route.params.video_id
    const platform = ref(route.query.platform || '')
    const loading = ref(true)
    const error = ref('')
    const analysis = ref({})
    const hotMoments = ref([])
    const reportsLoading = ref(true)
    const reportsError = ref('')
    const unlockDialog = ref(null)
    const activeReport = ref(null)
    const unlockPrice = ref(null)
    const unlockBusy = ref(false)
    const unlockError = ref('')
    const unlockNeedsRecharge = ref(false)
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

    const fetchReports = async () => {
      const request = ++reportsRequest
      reportsLoading.value = true
      reportsError.value = ''
      try {
        const data = await getRecordingClipReports(videoId, platformLabel.value.toLowerCase())
        if (request !== reportsRequest) return
        if (!Array.isArray(data?.items)) throw new Error('无效的片段报告响应')

        hotMoments.value = data.items.map((report, index) => {
          const unlocked = report.unlocked === true
          const windows = unlocked && Array.isArray(report.highlights)
            ? report.highlights.filter(({ start_seconds, end_seconds }) =>
              Number.isFinite(start_seconds) && Number.isFinite(end_seconds) && start_seconds >= 0 && end_seconds > start_seconds)
            : []
          return {
            id: report.id,
            markerNo: index + 1,
            locked: !unlocked && report.highlight_count > 0,
            highlight_count: report.highlight_count,
            windows,
            comments_score: unlocked ? report.comments_score : null,
            unlock_price_points: report.unlock_price_points,
            previewSummary: report.spoiler_free_summary,
            summary: unlocked ? report.summary || report.spoiler_free_summary : report.spoiler_free_summary
          }
        })
      } catch {
        if (request === reportsRequest) reportsError.value = '片段报告加载失败，请重试。'
      } finally {
        if (request === reportsRequest) reportsLoading.value = false
      }
    }

    const openUnlockDialog = async (report) => {
      if (!currentUser.value) {
        emit('request-login')
        return
      }
      if (unlockDialog.value?.open) return
      activeReport.value = report
      unlockPrice.value = null
      unlockError.value = ''
      unlockNeedsRecharge.value = false
      await nextTick()
      if (activeReport.value !== report || !unlockDialog.value) return
      unlockDialog.value.showModal()
      await loadUnlockQuote()
    }

    const closeUnlockDialog = () => {
      if (!unlockBusy.value) unlockDialog.value?.close()
    }

    const handleUnlockCancel = (event) => {
      if (unlockBusy.value) event.preventDefault()
    }

    const loadUnlockQuote = async () => {
      if (unlockBusy.value || !activeReport.value || !currentUser.value) return
      const report = activeReport.value
      unlockBusy.value = true
      unlockError.value = ''
      try {
        const quote = await getClipReportUnlockQuote(report.id)
        if (report !== activeReport.value) return
        if (quote?.already_unlocked) {
          unlockDialog.value?.close()
          await fetchReports()
          return
        }
        const price = quote?.unlock_price_points
        if (!Number.isSafeInteger(price) || price <= 0) throw new Error('无法获取解锁价格，请重试。')
        unlockPrice.value = price
      } catch (error) {
        if (report === activeReport.value) unlockError.value = error.message || '无法获取解锁价格，请重试。'
      } finally {
        unlockBusy.value = false
      }
    }

    const confirmUnlock = async () => {
      if (unlockBusy.value || unlockPrice.value === null || !activeReport.value || !currentUser.value) return
      const report = activeReport.value
      const user = currentUser.value
      unlockBusy.value = true
      unlockError.value = ''
      unlockNeedsRecharge.value = false
      try {
        const result = await unlockClipReport(report.id, { confirm: true, expected_price_points: unlockPrice.value })
        if (result?.success && currentUser.value === user) void refreshWallet()
        if (report !== activeReport.value) return
        if (!result?.success) throw new Error('解锁失败，请重试。')
        unlockDialog.value?.close()
        showNotification('片段起止时间和得分已解锁')
        await fetchReports()
      } catch (error) {
        if (report !== activeReport.value) return
        unlockNeedsRecharge.value = error.code === 'INSUFFICIENT_POINTS'
        if (error.status === 409) unlockPrice.value = null
        unlockError.value = error.message || '解锁失败，请重试。'
      } finally {
        unlockBusy.value = false
      }
    }

    const getMomentMarkers = (series, moments) => {
      const indexes = new Map(series.map((point, index) => [getOffsetSeconds(point), index]))
      const markers = new Map()

      for (const moment of moments) {
        for (const window of moment.windows) {
          // The chart uses minute buckets. The report itself retains exact start/end times.
          const minute = Math.floor((window.start_seconds + window.end_seconds) / 120) * 60
          const index = indexes.get(minute)
          if (index === undefined) continue
          const numbers = markers.get(index) ?? new Set()
          numbers.add(moment.markerNo)
          markers.set(index, numbers)
        }
      }

      return new Map(Array.from(markers, ([index, numbers]) => [index, [...numbers].join('、')]))
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

    const renderTimeSeriesChart = () => {
      const canvas = chartCanvas.value
      if (chartInstance) {
        chartInstance.destroy()
        chartInstance = null
      }
      if (!canvas || !timeSeriesData.value.length) return

      const series = timeSeriesData.value
      const labels = series.map((p) => p.formatted_time || formatSeconds(getOffsetSeconds(p)))
      const values = series.map((p) => p.score ?? 0)
      const markerByIndex = getMomentMarkers(series, hotMoments.value)
      const momentColor = '#bd501b'
      const pointBg = series.map((_, index) => markerByIndex.has(index) ? momentColor : '#a4a7e6')
      const pointRadii = series.map((point, index) => {
        if (markerByIndex.has(index)) return 4
        return point.is_peak ? 2 : 0
      })

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
          if (version !== analysisRequest) return
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
          if (version !== analysisRequest) return
          const chunk = Array.isArray(pageData?.time_series_data) ? pageData.time_series_data : []
          if (!chunk.length) break

          mergedSeries.push(...chunk)
          if (chunk.length < TIME_SERIES_PAGE_SIZE) break
          offset += chunk.length
        }

        if (version !== analysisRequest) return
        timeSeriesData.value = mergedSeries
      } catch (seriesErr) {
        if (version !== analysisRequest) return
        timeSeriesData.value = []
        console.error('获取热度数据失败', seriesErr)
        seriesError.value = '热度数据加载失败，可重新应用分析参数。'
      } finally {
        if (version === analysisRequest) seriesLoading.value = false
      }
    }

    const fetchAnalysisData = async () => {
      try {
        const version = ++analysisRequest
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
        if (version !== analysisRequest) return

        analysis.value = data || {}
        timeSeriesData.value = []
        seriesError.value = ''
        seriesLoading.value = true
        loading.value = false
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

    watch([timeSeriesData, hotMoments, chartCanvas], renderTimeSeriesChart, { flush: 'post' })
    watch(currentUser, () => {
      hotMoments.value = hotMoments.value.map(moment => ({
        ...moment,
        locked: moment.highlight_count > 0,
        windows: [],
        comments_score: null,
        summary: moment.previewSummary
      }))
      unlockDialog.value?.close()
      activeReport.value = null
      void fetchReports()
    })

    onMounted(async () => {
      void fetchReports()
      await fetchAnalysisData()
      loading.value = false
    })

    onBeforeUnmount(() => {
      analysisRequest += 1
      reportsRequest += 1
      activeReport.value = null
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
      reportsLoading,
      reportsError,
      fetchReports,
      unlockDialog,
      activeReport,
      unlockPrice,
      unlockBusy,
      unlockError,
      unlockNeedsRecharge,
      openUnlockDialog,
      closeUnlockDialog,
      handleUnlockCancel,
      loadUnlockQuote,
      confirmUnlock,
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
.hot-moments { margin-top: 1.2rem; }
.hot-moments .analysis-header { padding: 1rem 1.25rem; }
.moment-count { color: var(--muted-2); font-size: .8rem; white-space: nowrap; }
.moments-list {
  columns: 21rem 2;
  column-gap: .9rem;
  margin: 0;
  padding: 0 1.25rem .4rem;
  list-style: none;
}
.moment { break-inside: avoid; margin-bottom: .9rem; }

@media (max-width: 560px) {
  .time-series-chart, .hot-moments .analysis-header, .moments-list { padding-inline: .85rem; }
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
