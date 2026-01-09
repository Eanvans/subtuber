<template>
  <div class="vod-section">
    <h3 class="section-title">{{ title }}</h3>
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
          <div class="rec-meta">{{ v.platform }} · {{ v.duration }}</div>

          <!-- Inline line chart -->
          <div class="rec-chart">
            <div style="height:140px; position:relative">
              <canvas :id="`chart-${v.video_id}`" style="width:100%; height:100%"></canvas>
            </div>
          </div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick, watch } from 'vue'
import Chart from 'chart.js/auto'

export default {
  name: 'VODList',
  props: {
    vods: {
      type: Array,
      default: () => []
    },
    analysisMap: {
      type: Object,
      default: () => ({})
    },
    title: {
      type: String,
      default: '近期直播回放'
    }
  },
  setup(props) {
    const charts = {}

    const formatOffset = (sec) => {
      if (sec == null || isNaN(sec)) return ''
      const m = Math.floor(sec / 60)
      const s = Math.floor(sec % 60)
      return `${m}:${String(s).padStart(2, '0')}`
    }

    const setCanvasToScreenWidth = (canvas) => {
      if (!canvas) return
      const parent = canvas.parentElement || canvas.closest('div')
      const w = parent ? parent.clientWidth : (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth)
      const h = parent ? parent.clientHeight : 120
      const dpr = window.devicePixelRatio || 1
      canvas.style.width = w + 'px'
      canvas.width = Math.floor(w * dpr)
      canvas.style.height = h + 'px'
      canvas.height = Math.floor(h * dpr)
    }

    const renderChart = (vid) => {
      const series = props.analysisMap[vid] || []
      const canvas = document.querySelector(`#chart-${vid}`)
      if (!canvas) return

      setCanvasToScreenWidth(canvas)
      let labels = series.map((p) => p.formatted_time || formatOffset(p.offset_seconds))
      labels = labels.map((l) => String(l))
      const values = series.map((p) => p.score ?? 0)
      const pointBg = series.map((p) => p.is_peak ? '#ef4444' : '#3b82f6')
      const pointRadii = series.map((p) => p.is_peak ? 6 : 2)

      if (charts[vid]) {
        charts[vid].data.labels = labels
        charts[vid].data.datasets[0].data = values
        charts[vid].update()
        charts[vid].resize()
      } else {
        const ctx = canvas.getContext('2d')
        const canvasWidth = canvas.clientWidth || (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth)
        const approxLabelWidth = 100
        const maxTicksLimit = Math.max(2, Math.floor(canvasWidth / approxLabelWidth))
        const step = Math.max(1, Math.ceil(labels.length / maxTicksLimit))
        
        charts[vid] = new Chart(ctx, {
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
    }

    const renderAllCharts = async () => {
      await nextTick()
      props.vods.forEach(v => {
        if (v.video_id && props.analysisMap[v.video_id]) {
          renderChart(v.video_id)
        }
      })
    }

    watch(() => props.analysisMap, () => {
      renderAllCharts()
    }, { deep: true })

    watch(() => props.vods, () => {
      renderAllCharts()
    }, { deep: true })

    onMounted(() => {
      renderAllCharts()
    })

    return {
      charts
    }
  }
}
</script>

<style scoped>
.vod-section {
  margin-top: 2rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--muted, #374151);
  margin-bottom: 1rem;
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
  text-decoration: none;
  color: inherit;
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

.rec-info {
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

.rec-chart {
  margin-top: 8px;
}

.rec-chart canvas {
  width: 100%;
  height: 80px;
}
</style>
