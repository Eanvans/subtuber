<template>
  <main class="workspace-width workspace-page settings-page">
    <header class="page-header settings-heading">
      <div>
        <h1>账号设置</h1>
        <p>查看个人资料与账号偏好。</p>
      </div>
      <button v-if="user" type="button" class="btn btn-outline btn-sm" @click="openLogoutDialog">
        <i class="bi bi-box-arrow-right" aria-hidden="true"></i> 退出登录
      </button>
    </header>

    <section v-if="!user" class="surface settings-state" aria-labelledby="signed-out-title">
      <h2 id="signed-out-title">请先登录</h2>
      <p>登录后可以查看个人资料和账号偏好。</p>
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
    </template>

    <dialog
      ref="logoutDialog"
      class="workspace-dialog"
      aria-labelledby="logout-dialog-title"
      @cancel="handleCancel"
      @click.self="closeLogoutDialog"
    >
      <div class="workspace-dialog-content">
        <button type="button" class="workspace-dialog-close" aria-label="关闭弹窗" :disabled="submitting" @click="closeLogoutDialog">×</button>
        <header class="workspace-dialog-header">
          <h2 id="logout-dialog-title">退出登录</h2>
          <p>重新登录后可继续查看个人资料和订阅。</p>
        </header>

        <form @submit.prevent="confirmLogout">
          <p v-if="logoutError" class="workspace-dialog-error" role="alert">{{ logoutError }}</p>
          <footer class="workspace-dialog-actions">
            <button type="button" class="btn btn-outline" autofocus :disabled="submitting" @click="closeLogoutDialog">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? '正在退出…' : '退出登录' }}
            </button>
          </footer>
        </form>
      </div>
    </dialog>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

defineEmits(['request-login'])

const router = useRouter()
const { currentUser: user, logout } = useAuth()
const displayName = computed(() => user.value?.displayName || user.value?.display_name || user.value?.email || '我的账号')
const avatarLetter = computed(() => Array.from(displayName.value)[0].toUpperCase())
const emailNotificationLabel = computed(() => {
  const enabled = user.value?.preferences?.emailNotifications
  return enabled == null ? '未设置' : enabled ? '已启用' : '已关闭'
})

const languages = { 'zh-CN': '简体中文', 'zh-TW': '繁體中文', en: 'English', 'en-US': 'English' }
const dateFormat = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23' })
const logoutDialog = ref(null)
const logoutError = ref('')
const submitting = ref(false)

function formatDate(value) {
  const date = value ? new Date(String(value).replace(' ', 'T')) : new Date(NaN)
  return Number.isFinite(date.getTime()) ? dateFormat.format(date) : '—'
}

function openLogoutDialog() {
  if (logoutDialog.value?.open || submitting.value) return
  logoutError.value = ''
  logoutDialog.value?.showModal()
}

function handleCancel(event) {
  if (submitting.value) event.preventDefault()
}

function closeLogoutDialog() {
  if (!submitting.value) logoutDialog.value?.close()
}

async function confirmLogout() {
  if (submitting.value) return
  logoutError.value = ''
  submitting.value = true

  try {
    await logout()
    logoutDialog.value?.close()
    await router.push('/')
  } catch {
    logoutError.value = '退出登录失败，请稍后重试。'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.settings-heading .btn { flex-shrink: 0; }
.account-grid { display: grid; grid-template-columns: 1.45fr 1fr; gap: 1rem; }
.account-grid > :only-child { grid-column: 1 / -1; }
.profile-panel { padding: 1.15rem 1.25rem; }
.profile-header { display: flex; align-items: center; gap: .8rem; margin-bottom: 1rem; min-width: 0; }
.profile-avatar {
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 9px;
}
.profile-avatar { flex: 0 0 51px; height: 51px; font-size: 1.35rem; font-weight: 750; }
.profile-header h2, .settings-panel-header h2, .settings-state h2 { margin: 0; }
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

.settings-state { display: grid; justify-items: center; gap: .55rem; padding: 2.4rem 1.15rem; text-align: center; }
.settings-state h2 { font-size: .98rem; }
.settings-state p { margin: 0; color: var(--muted-2); font-size: .83rem; line-height: 1.55; }
.settings-badge { display: inline-flex; align-items: center; border-radius: 5px; padding: .17rem .42rem; background: #edf0f6; color: #495873; font-size: .72rem; font-weight: 650; white-space: nowrap; }
.settings-badge.positive { background: #e5f6ef; color: #13634e; }

@media (max-width: 700px) {
  .account-grid { grid-template-columns: 1fr; }
}
@media (max-width: 390px) {
  .settings-heading { gap: .65rem; }
}
</style>
