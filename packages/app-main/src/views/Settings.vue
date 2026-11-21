<template>
  <main class="workspace-width workspace-page settings-page">
    <header class="page-header settings-heading">
      <div>
        <h1>账号设置</h1>
        <p>查看个人资料与偏好，管理用于内容分析的 API Key。</p>
      </div>
      <button v-if="user" type="button" class="btn btn-outline btn-sm" @click="openDialog('logout')">
        <i class="bi bi-box-arrow-right" aria-hidden="true"></i> 退出登录
      </button>
    </header>

    <section v-if="!user" class="surface settings-state" aria-labelledby="signed-out-title">
      <h2 id="signed-out-title">请先登录</h2>
      <p>登录后可以查看账号资料和 API Key。</p>
      <button type="button" class="btn btn-primary btn-sm" @click="$emit('request-login')">登录</button>
    </section>

    <template v-else>
      <div class="account-grid">
        <section class="surface profile-panel" aria-labelledby="profile-title">
          <header class="profile-header">
            <span class="profile-avatar" aria-hidden="true">{{ avatarLetter }}</span>
            <div>
              <h2 id="profile-title">{{ displayName }}</h2>
              <p>{{ user.email || '暂无邮箱地址' }}</p>
            </div>
          </header>
          <dl class="profile-dates">
            <div>
              <dt>注册时间</dt>
              <dd>{{ formatDate(user.registeredAt || user.created_at) }}</dd>
            </div>
            <div>
              <dt>最近登录</dt>
              <dd>{{ formatDate(user.lastLoginAt || user.last_login_at) }}</dd>
            </div>
          </dl>
        </section>

        <section v-if="user.preferences" class="surface preference-panel" aria-labelledby="preferences-title">
          <header class="settings-panel-header">
            <h2 id="preferences-title"><i class="bi bi-sliders" aria-hidden="true"></i> 账号偏好</h2>
          </header>
          <dl class="preferences-list">
            <div>
              <dt>语言</dt>
              <dd>{{ languages[user.preferences.language] || user.preferences.language || '—' }}</dd>
            </div>
            <div>
              <dt>时区</dt>
              <dd>{{ user.preferences.timezone || '—' }}</dd>
            </div>
            <div>
              <dt>邮件通知</dt>
              <dd>
                <span class="settings-badge" :class="{ positive: user.preferences.emailNotifications === true }">
                  {{ emailNotificationLabel }}
                </span>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section class="surface keys-panel" aria-labelledby="keys-title" :aria-busy="loading">
        <header class="settings-panel-header keys-header">
          <div>
            <h2 id="keys-title">API Key 管理</h2>
            <p>管理 AI 服务提供商的密钥与默认配置。</p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" :disabled="!userHash" @click="openDialog('create')">
            <span class="add-icon" aria-hidden="true">+</span> 添加 API Key
          </button>
        </header>

        <div v-if="!userHash" class="settings-state" role="status">
          <h3>账号信息不完整</h3>
          <p>请退出并重新登录后管理 API Key。</p>
        </div>
        <div v-else-if="loading" class="settings-state" role="status">
          <span class="state-icon"><i class="bi bi-arrow-repeat" aria-hidden="true"></i></span>
          <h3>正在加载 API Key…</h3>
        </div>
        <div v-else-if="listError" class="settings-state" role="status">
          <span class="state-icon"><i class="bi bi-exclamation-circle" aria-hidden="true"></i></span>
          <h3>API Key 列表加载失败</h3>
          <button type="button" class="btn btn-outline btn-sm" @click="loadApiKeys">重新加载</button>
        </div>
        <div v-else-if="!apiKeys.length" class="settings-state">
          <span class="state-icon"><i class="bi bi-key" aria-hidden="true"></i></span>
          <h3>暂无 API Key</h3>
          <p>添加 AI 服务提供商的密钥后，可将其用于内容分析。</p>
        </div>

        <template v-else>
          <table class="keys-table">
            <thead>
              <tr>
                <th scope="col">名称 / 提供商</th>
                <th scope="col">状态</th>
                <th scope="col">创建时间</th>
                <th scope="col" class="key-actions-heading">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="key in apiKeys" :key="key.id">
                <td class="key-name-cell">
                  <div class="key-identity">
                    <span class="key-icon"><i class="bi bi-key" aria-hidden="true"></i></span>
                    <div>
                      <strong>{{ key.label || providerLabel(key.provider) }}</strong>
                      <span v-if="key.label">{{ providerLabel(key.provider) }}</span>
                      <span v-if="key.notes" class="key-notes">{{ key.notes }}</span>
                    </div>
                  </div>
                </td>
                <td class="key-status-cell">
                  <div class="key-badges">
                    <span class="settings-badge" :class="{ positive: key.enabled }">{{ key.enabled ? '已启用' : '已禁用' }}</span>
                    <span v-if="key.isDefault" class="settings-badge default">默认</span>
                  </div>
                </td>
                <td class="key-date-cell">
                  {{ formatDate(key.createdAt) }}
                  <small v-if="key.expiresAt">到期 {{ formatDate(key.expiresAt) }}</small>
                </td>
                <td class="key-actions">
                  <button type="button" class="btn btn-outline btn-sm" :aria-label="`编辑 ${key.label || providerLabel(key.provider)}`" @click="openDialog('edit', key)">编辑</button>
                  <button type="button" class="btn btn-outline btn-sm danger-text" :aria-label="`删除 ${key.label || providerLabel(key.provider)}`" @click="openDialog('delete', key)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
          <footer class="keys-footer">共 {{ apiKeys.length }} 个 API Key</footer>
        </template>
      </section>
    </template>

    <dialog
      ref="settingsDialog"
      class="workspace-dialog settings-dialog"
      aria-labelledby="settings-dialog-title"
      @cancel="handleCancel"
      @click.self="closeDialog"
      @close="resetDialog"
    >
      <div v-if="mode" class="settings-dialog-content">
        <button type="button" class="workspace-dialog-close" aria-label="关闭弹窗" :disabled="submitting" @click="closeDialog">×</button>
        <header class="settings-dialog-header">
          <h2 id="settings-dialog-title">{{ dialogTitle }}</h2>
          <p v-if="mode === 'create'">填写服务提供商与密钥。可为密钥加上易于识别的名称。</p>
          <p v-else-if="mode === 'edit'">编辑提供商和配置，或填写新密钥以替换现有密钥。</p>
          <p v-else-if="mode === 'delete'">确定删除「{{ keyName }}」？已使用该密钥的分析配置可能需要更换密钥。</p>
          <p v-else>退出后，需要重新登录才能管理账号和 API Key。</p>
        </header>

        <form @submit.prevent="submitDialog">
          <fieldset v-if="isKeyForm" class="settings-fields" :disabled="submitting">
            <div class="settings-field">
              <label for="key-provider">服务提供商 <span class="required-mark">*</span></label>
              <select id="key-provider" v-model="form.provider" required autofocus>
                <option value="" disabled>选择服务提供商</option>
                <option v-if="form.provider && !providers[form.provider]" :value="form.provider">{{ form.provider }}</option>
                <option v-for="(label, provider) in providers" :key="provider" :value="provider">{{ label }}</option>
              </select>
            </div>
            <div class="settings-field">
              <label for="key-label">名称</label>
              <input id="key-label" v-model.trim="form.label" type="text" maxlength="100" placeholder="例如：个人分析" />
            </div>
            <div class="settings-field full-width">
              <label for="key-secret">API Key <span v-if="mode === 'create'" class="required-mark">*</span></label>
              <input
                id="key-secret"
                v-model.trim="form.secret"
                type="password"
                autocomplete="new-password"
                spellcheck="false"
                :required="mode === 'create'"
                :placeholder="mode === 'edit' ? '留空则保留现有密钥' : '粘贴提供商发放的密钥'"
              />
            </div>
            <template v-if="mode === 'edit'">
              <div class="settings-field full-width">
                <label for="key-notes">备注</label>
                <textarea id="key-notes" v-model.trim="form.notes" rows="2" maxlength="500"></textarea>
              </div>
              <div class="settings-field full-width">
                <label for="key-expiry">过期时间</label>
                <input id="key-expiry" v-model="form.expiresAt" type="datetime-local" />
              </div>
            </template>
            <div class="settings-checks full-width">
              <label><input v-model="form.isDefault" type="checkbox" /> 设为该提供商的默认密钥</label>
              <label v-if="mode === 'edit'"><input v-model="form.enabled" type="checkbox" /> 启用密钥</label>
            </div>
          </fieldset>

          <p v-if="formError" class="settings-error" role="alert">{{ formError }}</p>
          <footer class="settings-dialog-actions">
            <button type="button" class="btn btn-outline" :autofocus="!isKeyForm" :disabled="submitting" @click="closeDialog">取消</button>
            <button type="submit" class="btn" :class="mode === 'delete' ? 'btn-danger' : 'btn-primary'" :disabled="submitting">
              {{ submitting ? '处理中…' : submitLabel }}
            </button>
          </footer>
        </form>
      </div>
    </dialog>
  </main>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import { useAuth } from '../composables/useAuth'
import { showNotification } from '../utils/notification'

defineEmits(['request-login'])

const router = useRouter()
const { currentUser: user, logout } = useAuth()
const userHash = computed(() => {
  const account = user.value
  return account?.userId || account?.user_id || account?.userHash || account?.user_hash || account?.hash || account?.id
})
const displayName = computed(() => user.value?.displayName || user.value?.display_name || user.value?.email || '我的账号')
const avatarLetter = computed(() => Array.from(displayName.value)[0].toUpperCase())
const emailNotificationLabel = computed(() => {
  const enabled = user.value?.preferences?.emailNotifications
  return enabled == null ? '未设置' : enabled ? '已启用' : '已关闭'
})

const languages = { 'zh-CN': '简体中文', 'zh-TW': '繁體中文', en: 'English', 'en-US': 'English' }
const providers = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  google: 'Google (Gemini)',
  deepseek: 'DeepSeek',
  zhipu: '智谱 AI',
  moonshot: '月之暗面 (Kimi)',
  alibaba: '阿里云',
  tencent: '腾讯云',
  baidu: '百度',
  other: '其他'
}
const dateFormat = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23' })
const apiKeys = ref([])
const loading = ref(false)
const listError = ref(false)
const settingsDialog = ref(null)
const mode = ref('')
const activeKey = ref(null)
const form = ref(blankForm())
const formError = ref('')
const submitting = ref(false)
let listRequest = 0

const isKeyForm = computed(() => mode.value === 'create' || mode.value === 'edit')
const keyName = computed(() => activeKey.value?.label || providerLabel(activeKey.value?.provider))
const dialogTitle = computed(() => ({
  create: '添加 API Key', edit: '编辑 API Key', delete: '删除 API Key', logout: '退出登录'
})[mode.value])
const submitLabel = computed(() => ({
  create: '添加密钥', edit: '保存修改', delete: '确认删除', logout: '退出登录'
})[mode.value])

function blankForm() {
  return { provider: '', secret: '', label: '', notes: '', expiresAt: '', isDefault: false, enabled: true }
}

function providerLabel(provider) {
  return providers[provider] || provider || '未知提供商'
}

function parseDate(value) {
  return value ? new Date(String(value).replace(' ', 'T')) : new Date(NaN)
}

function formatDate(value) {
  const date = parseDate(value)
  return Number.isFinite(date.getTime()) ? dateFormat.format(date) : '—'
}

function dateForInput(value) {
  const date = parseDate(value)
  if (!Number.isFinite(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function normalizeKey(key) {
  return {
    id: key.id,
    provider: key.provider,
    label: key.label,
    notes: key.notes,
    isDefault: Boolean(key.is_default ?? key.isDefault),
    enabled: (key.is_enabled ?? key.isEnabled) !== false,
    createdAt: key.created_at ?? key.createdAt,
    expiresAt: key.expires_at ?? key.expiresAt
  }
}

async function loadApiKeys() {
  const request = ++listRequest
  const hash = userHash.value
  listError.value = false
  loading.value = Boolean(hash)
  if (!hash) return

  try {
    const response = await api.getUserApiKeys(hash)
    if (!response?.success || (response.data != null && !Array.isArray(response.data))) {
      throw new Error('无法读取 API Key 列表')
    }
    if (request === listRequest) apiKeys.value = (response.data || []).map(normalizeKey)
  } catch {
    if (request === listRequest) listError.value = true
  } finally {
    if (request === listRequest) loading.value = false
  }
}

async function openDialog(nextMode, key = null) {
  if (settingsDialog.value?.open || submitting.value) return
  resetDialog()
  mode.value = nextMode
  activeKey.value = key
  if (nextMode === 'edit' && key) {
    form.value = {
      provider: key.provider || '',
      secret: '',
      label: key.label || '',
      notes: key.notes || '',
      expiresAt: dateForInput(key.expiresAt),
      isDefault: key.isDefault,
      enabled: key.enabled
    }
  }
  await nextTick()
  settingsDialog.value?.showModal()
}

function handleCancel(event) {
  if (submitting.value) event.preventDefault()
}

function closeDialog() {
  if (!submitting.value) settingsDialog.value?.close()
}

function resetDialog() {
  mode.value = ''
  activeKey.value = null
  form.value = blankForm()
  formError.value = ''
}

function mutationError(error, action) {
  const status = error.response?.status
  if (status === 404 || status === 405) return `当前后端未提供「${action}」接口。`
  if (status === 401 || status === 403) return '登录已失效或权限不足，请重新登录后再试。'
  if (error.code === 'ECONNABORTED') return '请求超时。可关闭弹窗并刷新列表查看结果。'
  if (typeof error.response?.data?.message === 'string' && error.response.data.message.includes('标签已存在')) return '该提供商下已有同名密钥，请更换名称。'
  return `${action}失败，请稍后重试。`
}

async function submitDialog() {
  if (submitting.value) return
  const action = mode.value
  const hash = userHash.value
  if (!hash && action !== 'logout') return
  formError.value = ''
  submitting.value = true

  try {
    if (action === 'logout') {
      await logout()
      settingsDialog.value?.close()
      await router.push('/')
      return
    }

    let response
    if (action === 'delete') {
      response = await api.deleteApiKey(activeKey.value.id)
    } else {
      const { provider, secret, label, notes, expiresAt, isDefault, enabled } = form.value
      if (!provider || (action === 'create' && !secret)) {
        formError.value = '请填写服务提供商和 API Key。'
        return
      }
      const data = { provider, label, is_default: isDefault }
      if (secret) data.api_key = secret
      if (action === 'edit') {
        const expiry = parseDate(expiresAt)
        data.expires_at = Number.isFinite(expiry.getTime()) ? expiry.toISOString() : ''
        data.notes = notes
        data.is_enabled = enabled
        response = await api.updateApiKey(activeKey.value.id, data)
      } else {
        response = await api.createApiKey({ ...data, user_hash: hash })
      }
    }

    if (!response?.success) throw new Error('接口未确认修改成功')
    settingsDialog.value?.close()
    showNotification(action === 'delete' ? 'API Key 已删除' : action === 'edit' ? 'API Key 已更新' : 'API Key 已添加')
    if (userHash.value === hash) void loadApiKeys()
  } catch (error) {
    formError.value = mutationError(error, dialogTitle.value)
  } finally {
    submitting.value = false
  }
}

watch(userHash, () => {
  apiKeys.value = []
  settingsDialog.value?.close()
  void loadApiKeys()
}, { immediate: true })
</script>

<style scoped>
.settings-heading .btn { flex-shrink: 0; }
.account-grid { display: grid; grid-template-columns: 1.45fr 1fr; gap: 1rem; margin-bottom: 1.25rem; }
.account-grid > :only-child { grid-column: 1 / -1; }
.profile-panel { padding: 1.15rem 1.25rem; }
.profile-header { display: flex; align-items: center; gap: .8rem; margin-bottom: 1rem; min-width: 0; }
.profile-avatar, .state-icon, .key-icon {
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 9px;
}
.profile-avatar { flex: 0 0 51px; height: 51px; font-size: 1.35rem; font-weight: 750; }
.profile-header h2, .settings-panel-header h2, .settings-state h2, .settings-state h3 { margin: 0; }
.profile-header h2 { font-size: 1.22rem; overflow-wrap: anywhere; }
.profile-header p { margin: .2rem 0 0; color: var(--muted-2); font-size: .85rem; overflow-wrap: anywhere; }
.profile-dates, .preferences-list { margin: 0; }
.profile-dates { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; padding-top: .88rem; border-top: 1px solid var(--border); }
.profile-dates dt, .preferences-list dt { color: var(--muted-2); font-size: .8rem; }
.profile-dates dd, .preferences-list dd { margin: 0; color: var(--text); font-size: .85rem; font-weight: 620; overflow-wrap: anywhere; }
.profile-dates dd { margin-top: .3rem; font-variant-numeric: tabular-nums; }
.settings-panel-header { padding: 1.05rem 1.25rem; }
.settings-panel-header h2 { font-size: 1.12rem; }
.preference-panel .settings-panel-header { padding-bottom: .6rem; }
.preference-panel h2 i { margin-right: .28rem; color: var(--accent); font-size: .9rem; }
.preferences-list { padding: 0 1.25rem .65rem; }
.preferences-list > div { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .46rem 0; }
.preferences-list > div + div { border-top: 1px solid var(--border); }

.keys-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .75rem; }
.keys-header p, .settings-state p { margin: .35rem 0 0; color: var(--muted-2); font-size: .83rem; line-height: 1.55; }
.add-icon { font-size: 1.05rem; line-height: 1; }
.settings-state { display: grid; justify-items: center; gap: .55rem; padding: 2.4rem 1.15rem; text-align: center; }
.keys-panel .settings-state { min-height: 180px; align-content: center; border-top: 1px solid var(--border); }
.settings-state h2, .settings-state h3 { font-size: .98rem; }
.settings-state p { margin: 0; }
.state-icon { width: 40px; height: 40px; font-size: 1.05rem; }

.keys-table { width: 100%; border-collapse: collapse; text-align: left; }
.keys-table th, .keys-table td { padding: .75rem 1.25rem; border-top: 1px solid var(--border); }
.keys-table th { background: #fafbfe; color: var(--muted-2); font-size: .76rem; font-weight: 650; }
.keys-table td { color: var(--muted); font-size: .81rem; }
.key-identity { display: flex; align-items: center; gap: .6rem; }
.key-icon { flex: 0 0 34px; height: 34px; }
.key-identity strong, .key-identity span:not(.key-icon), .key-date-cell small { display: block; overflow-wrap: anywhere; }
.key-identity strong { color: var(--text); font-size: .88rem; }
.key-identity span:not(.key-icon), .key-date-cell small { margin-top: .18rem; color: var(--muted-2); font-size: .75rem; }
.key-badges { display: flex; flex-wrap: wrap; gap: .3rem; }
.settings-badge { display: inline-flex; align-items: center; border-radius: 5px; padding: .17rem .42rem; background: #edf0f6; color: #495873; font-size: .72rem; font-weight: 650; white-space: nowrap; }
.settings-badge.positive { background: #e5f6ef; color: #13634e; }
.settings-badge.default { background: var(--accent-soft); color: var(--accent); }
.key-date-cell { font-variant-numeric: tabular-nums; }
.keys-table .key-actions-heading, .keys-table .key-actions { text-align: right; white-space: nowrap; }
.key-actions button + button { margin-left: .4rem; }
.danger-text { color: #a82632; }
.danger-text:hover { background: #fceef0; }
.keys-footer { padding: .75rem 1.25rem; border-top: 1px solid var(--border); color: var(--muted-2); font-size: .77rem; }

.settings-dialog { --dialog-width: 510px; }
.settings-dialog-content { padding: clamp(1rem, 4vw, 1.55rem); }
.settings-dialog-header { padding-right: 1.75rem; margin-bottom: 1.25rem; }
.settings-dialog-header h2 { margin: 0; font-size: 1.4rem; letter-spacing: -.025em; }
.settings-dialog-header p { margin: .38rem 0 0; color: var(--muted-2); font-size: .83rem; line-height: 1.6; overflow-wrap: anywhere; }
.settings-fields { min-width: 0; display: grid; grid-template-columns: 1fr 1fr; gap: .9rem; margin: 0; padding: 0; border: 0; }
.settings-field { min-width: 0; display: grid; gap: .35rem; }
.settings-field label, .settings-checks { color: var(--text); font-size: .82rem; font-weight: 650; }
.settings-field :is(input, select, textarea) {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  padding: .48rem .65rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  color: var(--text);
  font: inherit;
}
.settings-field textarea { resize: vertical; }
.settings-field input::placeholder { color: var(--muted-2); font-size: .82rem; }
.full-width { grid-column: 1 / -1; }
.required-mark { color: #a82632; }
.settings-checks { display: flex; flex-wrap: wrap; gap: .45rem 1rem; }
.settings-checks label { display: inline-flex; align-items: center; gap: .35rem; }
.settings-checks input { width: 16px; height: 16px; margin: 0; accent-color: var(--accent); }
.settings-dialog-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: .5rem; margin-top: 1.2rem; }
.settings-error { margin: .85rem 0 0; padding: .55rem .7rem; border-radius: 8px; background: #fceef0; color: #a82632; font-size: .82rem; }
.btn-danger { background: #ad2635; color: white; }
.btn-danger:hover:not(:disabled) { background: #8d1e2b; }

@media (max-width: 700px) {
  .account-grid { grid-template-columns: 1fr; }
  .keys-table th, .keys-table td { padding-inline: .75rem; }
}
@media (max-width: 570px) {
  .keys-table, .keys-table tbody { display: block; }
  .keys-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .keys-table tbody tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .55rem .35rem; padding: .75rem 1rem; border-top: 1px solid var(--border); }
  .keys-table tbody td { display: block; border: 0; padding: 0; }
  .key-name-cell { grid-column: 1; }
  .key-status-cell { grid-column: 2; align-self: center; }
  .key-date-cell { grid-column: 1; align-self: center; }
  .key-actions { grid-column: 2; }
}
@media (max-width: 390px) {
  .settings-heading { gap: .65rem; }
  .settings-fields { grid-template-columns: 1fr; gap: .7rem; }
}
</style>
