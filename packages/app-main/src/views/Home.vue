<template>
  <main class="workspace-width workspace-page">
    <header class="page-header">
      <div>
        <div class="home-title-row">
          <h1>内容分析工作台</h1>
          <small v-if="totalReports !== null" class="market-total">{{ formatCount(totalReports) }} 份市场报告</small>
        </div>
        <p>浏览直播切片报告，追踪订阅主播的回放与互动热点。</p>
      </div>
      <button type="button" class="btn btn-primary" @click="$emit('request-subscribe')">
        <span class="add-symbol" aria-hidden="true">+</span> 添加订阅
      </button>
    </header>

    <section id="clip-market" class="surface market-section" aria-labelledby="market-title">
      <header class="market-header">
        <div>
          <h2 id="market-title">切片市场</h2>
          <p>浏览切片报告，使用积分解锁原视频和片段详情。</p>
        </div>
        <button type="button" class="btn btn-outline btn-sm" :disabled="marketLoading" @click="fetchMarketplace(page)">
          <i class="bi bi-arrow-clockwise" aria-hidden="true"></i> 刷新
        </button>
      </header>

      <div v-if="marketReports.length && !marketError" class="market-controls">
        <label class="market-search">
          <i class="bi bi-search" aria-hidden="true"></i>
          <input v-model.trim="search" type="search" aria-label="搜索本页报告" placeholder="搜索本页报告" />
        </label>
        <select v-model="platform" class="market-select" aria-label="筛选本页报告平台">
          <option value="">全部平台</option>
          <option v-for="name in platforms" :key="name" :value="name">{{ name }}</option>
        </select>
        <span class="market-count" aria-live="polite">{{ formatCount(visibleReports.length) }} 份报告<span v-if="search || platform">匹配</span></span>
      </div>

      <div v-if="marketLoading" class="market-state" role="status">
        <span class="state-icon"><i class="bi bi-arrow-repeat" aria-hidden="true"></i></span>
        <h3>正在加载切片报告</h3>
      </div>
      <div v-else-if="marketError" class="market-state" role="status">
        <span class="state-icon"><i class="bi bi-exclamation-circle" aria-hidden="true"></i></span>
        <h3>切片报告加载失败</h3>
        <p>请稍后刷新，重新获取市场数据。</p>
        <button type="button" class="btn btn-outline btn-sm" @click="fetchMarketplace(page)">重新加载</button>
      </div>
      <div v-else-if="!marketReports.length" class="market-state" role="status">
        <span class="state-icon"><i class="bi bi-collection-play" aria-hidden="true"></i></span>
        <h3>暂无切片报告</h3>
        <p>分析完成的报告发布后会显示在这里。</p>
      </div>
      <div v-else-if="!visibleReports.length" class="market-state" role="status">
        <span class="state-icon"><i class="bi bi-search" aria-hidden="true"></i></span>
        <h3>本页没有匹配的报告</h3>
        <button type="button" class="btn btn-outline btn-sm" @click="clearFilters">清除筛选</button>
      </div>
      <div v-else class="report-grid">
        <ClipReportCard v-for="report in visibleReports" :key="report.id" :report="report" @open="openReport" />
      </div>

      <nav v-if="pageCount > 1" class="market-pagination" aria-label="市场报告分页">
        <span>第 {{ page }} / {{ pageCount }} 页 · 共 {{ formatCount(totalReports) }} 份</span>
        <div>
          <button type="button" class="btn btn-outline btn-sm" :disabled="page <= 1 || marketLoading" @click="changePage(page - 1)">上一页</button>
          <button type="button" class="btn btn-outline btn-sm" :disabled="page >= pageCount || marketLoading" @click="changePage(page + 1)">下一页</button>
        </div>
      </nav>
    </section>

    <dialog ref="reportDialog" class="report-dialog" aria-labelledby="report-title" @cancel="handleDialogCancel" @close="selectedReport = null">
      <template v-if="selectedReport">
        <header class="report-dialog-header">
          <div class="report-dialog-identity">
            <h2 id="report-title">报告摘要</h2>
            <div class="report-dialog-streamer">
              <ReportStreamer :name="selectedReport.streamer_name" :avatar-url="selectedReport.streamer_avatar_url" />
              <span class="platform-label" :data-platform="selectedReport.platform">{{ selectedReport.platform }}</span>
            </div>
          </div>
          <button type="button" class="dialog-close" aria-label="关闭报告" autofocus :disabled="reportBusy" @click="reportDialog.close()">×</button>
        </header>
        <div class="report-dialog-body" :aria-busy="reportBusy">
          <p>{{ selectedReport.is_unlocked ? selectedReport.summary : selectedReport.preview_summary }}</p>
          <section v-if="selectedReport.is_unlocked">
            <h3>高能片段</h3>
            <ul v-if="selectedReport.highlights.length" class="dialog-highlights">
              <li v-for="item in selectedReport.highlights" :key="item.id">
                <time v-if="item.time">{{ item.time }}</time>
                <div>
                  <strong>{{ item.label }}</strong>
                  <p v-if="item.summary && item.summary !== item.label">{{ item.summary }}</p>
                </div>
              </li>
            </ul>
            <p v-else>暂无片段数据</p>
          </section>
          <section v-else class="locked-report" aria-labelledby="locked-report-title">
            <div class="locked-report-heading">
              <span class="lock-icon"><i class="bi bi-lock" aria-hidden="true"></i></span>
              <div>
                <h3 id="locked-report-title">积分解锁完整报告</h3>
                <p>一次解锁，永久查看。</p>
              </div>
              <div class="unlock-cost">
                <template v-if="displayedUnlockPrice !== null">
                  <strong>{{ formatCount(displayedUnlockPrice) }}</strong> 积分
                </template>
                <span v-else>以报价为准</span>
              </div>
            </div>
            <ul class="locked-benefits">
              <li><i class="bi bi-play-btn" aria-hidden="true"></i> 原视频链接</li>
              <li><i class="bi bi-clock-history" aria-hidden="true"></i> 高能片段与时间戳</li>
            </ul>
          </section>
          <p v-if="reportMessage" class="dialog-status" role="status">{{ reportMessage }}</p>
        </div>
        <footer class="report-dialog-footer">
          <a v-if="selectedReport.is_unlocked && selectedReport.source_link" :href="selectedReport.source_link" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
            查看原视频 <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
          </a>
          <div class="dialog-actions">
            <span v-if="reportBusy" class="dialog-status" role="status">处理中…</span>
            <span v-else-if="selectedReport.is_unlocked" class="unlocked-label"><i class="bi bi-check-circle" aria-hidden="true"></i> 已解锁</span>
            <template v-else-if="unlockPrice !== null">
              <button type="button" class="btn btn-outline btn-sm" @click="cancelUnlock">取消</button>
              <button type="button" class="btn btn-primary btn-sm" @click="confirmUnlock">确认支付 {{ formatCount(unlockPrice) }} 积分</button>
            </template>
            <button v-else-if="needsDetail" type="button" class="btn btn-outline btn-sm" @click="loadReportDetail">重新获取报告</button>
            <button v-else type="button" class="btn btn-primary btn-sm" @click="requestUnlock">
              {{ currentUser ? '使用积分解锁' : '登录后解锁' }}
            </button>
          </div>
        </footer>
      </template>
    </dialog>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { getClipReportDetail, getClipReportUnlockQuote, getClipReportsMarketplace, unlockClipReport } from '../api/streamers'
import ClipReportCard from '../components/ClipReportCard.vue'
import ReportStreamer from '../components/ReportStreamer.vue'
import { useAuth } from '../composables/useAuth'
import { showNotification } from '../utils/notification'
import { formatPlatformName } from '../utils/platform'

const emit = defineEmits(['request-login', 'request-subscribe'])
const { currentUser } = useAuth()
const pageSize = 6
const marketReports = ref([])
const marketLoading = ref(true)
const marketError = ref(false)
const totalReports = ref(null)
const page = ref(1)
const search = ref('')
const platform = ref('')
const reportDialog = ref(null)
const selectedReport = ref(null)
const reportBusy = ref(false)
const reportMessage = ref('')
const unlockPrice = ref(null)
const needsDetail = ref(false)
const reportDetails = new Map()
let marketRequest = 0
const numberFormat = new Intl.NumberFormat('zh-CN')

const pageCount = computed(() => Math.max(1, Math.ceil(totalReports.value / pageSize)))
const displayedUnlockPrice = computed(() => unlockPrice.value ?? selectedReport.value?.unlock_cost ?? null)
const platforms = computed(() => [...new Set(marketReports.value.map(report => report.platform))].sort())
const visibleReports = computed(() => {
  const query = search.value.toLocaleLowerCase()
  return marketReports.value.filter(report => {
    if (platform.value && report.platform !== platform.value) return false
    return [report.title, report.streamer_name, report.source_video_id, report.preview_summary, report.platform]
      .some(value => String(value || '').toLocaleLowerCase().includes(query))
  })
})

function formatCount(value) {
  return value == null ? '—' : numberFormat.format(value)
}

function formatTime(value) {
  const seconds = Number(value)
  if (value == null || value === '' || !Number.isFinite(seconds) || seconds < 0) return ''
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const parts = hours ? [hours, minutes, Math.floor(seconds % 60)] : [minutes, Math.floor(seconds % 60)]
  return parts.map(part => String(part).padStart(2, '0')).join(':')
}

function sourceLink(value) {
  if (!value) return ''
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function normalizeReport(report, fallback = {}) {
  const id = report.id || report.report_id || fallback.id
  const isUnlocked = report.is_unlocked === true || report.unlocked === true
  const items = Array.isArray(report.highlights) ? report.highlights : []
  const previewItems = Array.isArray(report.preview_highlights) ? report.preview_highlights : []
  const count = report.highlight_count ?? (items.length || previewItems.length || fallback.highlight_count || 0)
  // Older responses may contain the source video ID and exact times in their summary.
  const publicSummary = report.highlight_count != null ? report.spoiler_free_summary : ''
  const preview = publicSummary || (count > 0 ? `本报告收录 ${count} 个片段，含片段说明和时间戳。` : '查看完整报告，了解直播内容。')
  const price = Number(report.unlock_cost ?? report.unlock_price_points ?? report.price ?? fallback.unlock_cost)
  return {
    id,
    source_video_id: isUnlocked ? report.source_video_id || report.video_id : undefined,
    source_link: isUnlocked ? sourceLink(report.source_url) : '',
    title: `切片报告 #${id}`,
    streamer_name: report.streamer_name || fallback.streamer_name || '',
    streamer_avatar_url: sourceLink(report.streamer_avatar_url) || fallback.streamer_avatar_url || '',
    platform: formatPlatformName(report.source_platform || report.platform || fallback.platform),
    date: report.completed_at || report.created_at || fallback.date,
    summary: isUnlocked ? report.summary || report.spoiler_free_summary || '暂无报告摘要' : preview,
    preview_summary: preview,
    unlock_cost: Number.isSafeInteger(price) && price > 0 ? price : null,
    is_unlocked: isUnlocked,
    highlight_count: count,
    highlights: isUnlocked ? items.map((item, index) => {
      const start = formatTime(item.start_seconds)
      const end = formatTime(item.end_seconds)
      return {
        id: item.id || index,
        label: item.label || item.title || item.summary || '高能片段',
        summary: item.summary || item.description || '',
        time: item.time || (start && end ? `${start} – ${end}` : start)
      }
    }) : []
  }
}

function clearFilters() {
  search.value = ''
  platform.value = ''
}

async function fetchMarketplace(requestedPage) {
  const request = ++marketRequest
  marketLoading.value = true
  marketError.value = false
  try {
    const data = await getClipReportsMarketplace({ page: requestedPage, page_size: pageSize })
    if (request !== marketRequest) return
    const items = Array.isArray(data) ? data : data?.items || data?.reports || []
    const total = data?.total ?? items.length
    const lastPage = Math.max(1, Math.ceil(total / pageSize))
    if (requestedPage > lastPage) {
      return fetchMarketplace(lastPage)
    }
    marketReports.value = items.map(item => {
      const report = normalizeReport(item)
      return reportDetails.get(report.id) || report
    })
    totalReports.value = total
    page.value = Number(data?.page) || requestedPage
    if (!platforms.value.includes(platform.value)) platform.value = ''
  } catch (error) {
    if (request !== marketRequest) return
    console.error('获取切片市场失败', error)
    marketError.value = true
  } finally {
    if (request === marketRequest) marketLoading.value = false
  }
}

async function changePage(nextPage) {
  clearFilters()
  await fetchMarketplace(nextPage)
  document.getElementById('clip-market')?.scrollIntoView({ block: 'start' })
}

async function openReport(report) {
  selectedReport.value = report
  unlockPrice.value = null
  needsDetail.value = false
  reportMessage.value = ''
  await nextTick()
  if (selectedReport.value?.id !== report.id || !reportDialog.value) return
  reportDialog.value.showModal()
  if (currentUser.value && !report.is_unlocked) void loadReportDetail()
}

function handleDialogCancel(event) {
  if (reportBusy.value) event.preventDefault()
}

async function fetchSelectedDetail() {
  const original = selectedReport.value
  const user = currentUser.value
  const data = await getClipReportDetail(original.id)
  if (currentUser.value !== user || selectedReport.value?.id !== original.id) return
  if (!data) throw new Error('报告详情暂不可用')

  const detail = normalizeReport(data.report || data, original)
  selectedReport.value = detail
  if (detail.is_unlocked) {
    reportDetails.set(detail.id, detail)
    marketReports.value = marketReports.value.map(report => report.id === detail.id ? detail : report)
  }
  return detail
}

async function loadReportDetail() {
  reportBusy.value = true
  reportMessage.value = ''
  try {
    await fetchSelectedDetail()
    needsDetail.value = false
  } catch {
    reportMessage.value = '暂时无法加载报告详情，请重试。'
    needsDetail.value = true
  } finally {
    reportBusy.value = false
  }
}

async function requestUnlock() {
  if (!currentUser.value) {
    reportDialog.value.close()
    emit('request-login')
    return
  }

  reportBusy.value = true
  reportMessage.value = ''
  try {
    const quote = await getClipReportUnlockQuote(selectedReport.value.id)
    if (quote?.already_unlocked) {
      needsDetail.value = true
      const detail = await fetchSelectedDetail()
      if (!detail?.is_unlocked) throw new Error('报告详情正在更新，请重试。')
      needsDetail.value = false
      return
    }
    const price = Number(quote?.unlock_price_points ?? quote?.unlock_cost ?? quote?.price ?? quote?.amount)
    if (!Number.isSafeInteger(price) || price <= 0) throw new Error('暂时无法获取解锁价格，请重试。')
    selectedReport.value = { ...selectedReport.value, unlock_cost: price }
    unlockPrice.value = price
    reportMessage.value = '确认支付后，将从你的账户扣除上方显示的积分。'
  } catch (error) {
    reportMessage.value = error.message || '暂时无法获取解锁价格，请重试。'
  } finally {
    reportBusy.value = false
  }
}

function cancelUnlock() {
  unlockPrice.value = null
  reportMessage.value = ''
}

async function confirmUnlock() {
  if (reportBusy.value || unlockPrice.value === null) return
  reportBusy.value = true
  reportMessage.value = ''
  try {
    const result = await unlockClipReport(selectedReport.value.id, {
      confirm: true,
      expected_price_points: unlockPrice.value
    })
    if (!result?.success) throw new Error('解锁失败，请稍后重试。')
    unlockPrice.value = null
    needsDetail.value = true
    const detail = await fetchSelectedDetail()
    if (!detail?.is_unlocked) throw new Error('报告正在更新')
    needsDetail.value = false
    showNotification('报告已解锁')
  } catch (error) {
    if (error.status === 409) {
      unlockPrice.value = null
      if (selectedReport.value) selectedReport.value = { ...selectedReport.value, unlock_cost: null }
    }
    reportMessage.value = needsDetail.value ? '报告已解锁，请重新获取详情。' : error.message || '解锁失败，请稍后重试。'
  } finally {
    reportBusy.value = false
  }
}

watch(currentUser, () => {
  reportDetails.clear()
  if (reportDialog.value?.open) reportDialog.value.close()
  void fetchMarketplace(page.value)
})
onMounted(() => fetchMarketplace(1))
</script>

<style scoped>
.add-symbol { font-size: 1.2rem; line-height: .9; }
.home-title-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: .3rem .8rem;
}

.market-total {
  color: var(--muted-2);
  font-size: .82rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.state-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 9px;
  color: var(--accent);
  background: var(--accent-soft);
  font-size: 1.2rem;
}

.market-section { scroll-margin-top: calc(var(--topbar-height) + 18px); }
.market-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .85rem;
  padding: 1.2rem 1.25rem 1.05rem;
}

.market-header h2 { margin: 0; font-size: 1.2rem; letter-spacing: -.025em; }
.market-header p { margin: .3rem 0 0; color: var(--muted-2); font-size: .83rem; line-height: 1.55; }
.market-header button { flex-shrink: 0; }

.market-controls {
  display: flex;
  align-items: center;
  gap: .65rem;
  padding: .7rem 1.25rem;
  border-block: 1px solid var(--border);
  background: #fafbfe;
}

.market-search, .market-select {
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--card);
  color: var(--muted);
  font-size: .82rem;
}

.market-search {
  width: min(100%, 255px);
  min-width: 0;
  display: flex;
  align-items: center;
  gap: .45rem;
  padding: 0 .65rem;
}

.market-search:focus-within { outline: 2px solid var(--accent); outline-offset: 1px; }
.market-search input { width: 100%; min-width: 0; border: 0; outline: none; color: var(--text); background: transparent; }
.market-search input:focus-visible { outline: none; }
.market-search input::placeholder { color: var(--muted-2); }
.market-select { padding: 0 .45rem 0 .6rem; }
.market-count { margin-left: auto; color: var(--muted-2); font-size: .78rem; white-space: nowrap; }

.report-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: .9rem;
  padding: 1.1rem 1.25rem 1.25rem;
}

.market-state {
  min-height: 275px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: .65rem;
  padding: 1rem;
  border-top: 1px solid var(--border);
  text-align: center;
}

.market-controls + .market-state { border-top: 0; }
.market-state h3 { margin: .2rem 0 0; font-size: 1rem; }
.market-state p { margin: 0; color: var(--muted-2); font-size: .86rem; }

.market-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: .65rem;
  padding: .8rem 1.25rem;
  border-top: 1px solid var(--border);
  color: var(--muted-2);
  font-size: .79rem;
}

.market-pagination div, .dialog-actions { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; }

.report-dialog {
  width: min(620px, calc(100% - 2rem));
  max-height: calc(100dvh - 2rem);
  padding: 0;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
}

.report-dialog[open] { display: flex; flex-direction: column; }
.report-dialog::backdrop { background: rgba(18, 25, 47, .58); }
.report-dialog-header, .report-dialog-footer {
  display: flex;
  justify-content: space-between;
  gap: .75rem;
  padding: 1rem 1.25rem;
}

.report-dialog-header { align-items: flex-start; border-bottom: 1px solid var(--border); }
.report-dialog-identity { min-width: 0; }
.report-dialog-header h2 { margin: 0; font-size: 1.28rem; }
.report-dialog-streamer { --report-avatar-size: 34px; display: flex; align-items: center; gap: .6rem; margin-top: .55rem; }
.report-dialog-streamer .platform-label { flex-shrink: 0; }
.report-dialog-footer { align-items: center; flex-wrap: wrap; border-top: 1px solid var(--border); }
.dialog-actions { margin-left: auto; }
.dialog-close { border: 0; background: transparent; color: var(--muted); font-size: 1.45rem; cursor: pointer; }
.report-dialog-body { overflow-y: auto; display: grid; gap: 1.15rem; padding: 1rem 1.25rem; }
.report-dialog-body h3 { margin: 0 0 .4rem; font-size: .92rem; }
.report-dialog-body p { margin: 0; color: var(--muted); font-size: .85rem; line-height: 1.65; overflow-wrap: anywhere; }
.report-dialog-body > p { white-space: pre-line; }
.locked-report { padding: .95rem; border: 1px solid #dcdffc; border-radius: 10px; background: #f5f6ff; }
.locked-report-heading { display: flex; align-items: center; flex-wrap: wrap; gap: .65rem; }
.lock-icon { display: grid; flex: 0 0 38px; height: 38px; place-items: center; border-radius: 8px; color: var(--accent); background: #e7e9ff; }
.locked-report-heading h3 { margin: 0; }
.locked-report-heading p { margin-top: .15rem; color: var(--muted-2); font-size: .77rem; }
.unlock-cost { margin-left: auto; color: var(--accent); font-size: .8rem; font-weight: 650; white-space: nowrap; }
.unlock-cost strong { font-size: 1.4rem; font-variant-numeric: tabular-nums; }
.locked-benefits { display: flex; flex-wrap: wrap; gap: .45rem 1rem; margin: .75rem 0 0; padding: .65rem 0 0; border-top: 1px solid #dcdffc; list-style: none; color: var(--muted); font-size: .78rem; }
.locked-benefits i { margin-right: .18rem; color: var(--accent); }
.dialog-highlights { display: grid; gap: .5rem; padding: 0; margin: 0; list-style: none; }
.dialog-highlights li { display: flex; flex-wrap: wrap; gap: .35rem .65rem; padding: .55rem .65rem; background: var(--bg); border-radius: 7px; font-size: .85rem; }
.dialog-highlights time { font-variant-numeric: tabular-nums; color: var(--accent); font-weight: 650; }
.dialog-highlights li > div { flex: 1 0 190px; min-width: 0; overflow-wrap: anywhere; }
.dialog-status { color: var(--muted-2); font-size: .8rem; }
.unlocked-label { color: #087661; font-size: .82rem; font-weight: 650; }

@media (max-width: 1150px) { .report-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 510px) {
  .market-count { display: none; }
  .report-grid { grid-template-columns: 1fr; }
  .market-header, .market-controls, .market-pagination, .report-grid { padding-inline: .85rem; }
}
</style>
