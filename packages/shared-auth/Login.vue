<template>
  <div class="login-form">
    <header class="login-heading">
      <h2 :id="titleId">邮箱登录</h2>
      <p>输入邮箱和 6 位验证码。首次登录将自动注册。</p>
    </header>

    <form novalidate @submit.prevent="handleVerify">
      <div class="login-field">
        <label :for="`${titleId}-email`">邮箱地址</label>
        <input
          :id="`${titleId}-email`"
          ref="emailInput"
          v-model.trim="email"
          required
          type="email"
          autocomplete="email"
          placeholder="请输入邮箱地址"
          :readonly="sending || verifying"
          :aria-invalid="Boolean(emailError)"
          :aria-describedby="emailError ? `${titleId}-email-error` : undefined"
          @input="handleEmailChange"
        />
        <p v-if="emailError" :id="`${titleId}-email-error`" class="field-error" role="alert">{{ emailError }}</p>
      </div>

      <div class="login-field">
        <label :for="`${titleId}-code`">验证码</label>
        <div class="code-row">
          <input
            :id="`${titleId}-code`"
            ref="codeInput"
            v-model.trim="code"
            required
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="6 位验证码"
            :readonly="verifying"
            :aria-invalid="Boolean(codeError)"
            :aria-describedby="codeError ? `${titleId}-code-error` : `${titleId}-code-help`"
            @input="codeError = ''; requestError = ''"
          />
          <button type="button" class="login-button code-button" :disabled="sending || verifying || cooldown > 0" @click="handleSend">
            {{ sending ? '正在发送…' : cooldown > 0 ? `${cooldown} 秒后重发` : '发送验证码' }}
          </button>
        </div>
        <p v-if="codeError" :id="`${titleId}-code-error`" class="field-error" role="alert">{{ codeError }}</p>
        <p v-else :id="`${titleId}-code-help`" class="field-hint">验证码有效期为 10 分钟。若未收到，请检查垃圾邮件。</p>
      </div>

      <p v-if="requestError" class="login-feedback is-error" role="alert">{{ requestError }}</p>
      <p v-else-if="sent" class="login-feedback is-success" role="status">验证码已发送，请查看邮箱。</p>

      <button type="submit" class="login-button submit-button" :disabled="sending || verifying">
        {{ verifying ? '正在登录…' : '登录' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { sendCode, verifyCode } from './index.js'

const props = defineProps({
  initialEmail: { type: String, default: '' },
  titleId: { type: String, default: 'email-login-title' }
})
const emit = defineEmits(['verified', 'sent', 'error'])

const email = ref(props.initialEmail)
const code = ref('')
const emailInput = ref(null)
const codeInput = ref(null)
const emailError = ref('')
const codeError = ref('')
const requestError = ref('')
const sending = ref(false)
const verifying = ref(false)
const sent = ref(false)
const cooldown = ref(0)
const cooldownKey = 'login_send_at'
const cooldownDuration = 60_000
let timer

function startCooldown(sentAt) {
  clearInterval(timer)
  const update = () => {
    cooldown.value = Math.max(0, Math.ceil((sentAt + cooldownDuration - Date.now()) / 1000))
    if (!cooldown.value) clearInterval(timer)
  }
  update()
  if (cooldown.value) timer = setInterval(update, 1000)
}

function handleEmailChange() {
  emailError.value = ''
  codeError.value = ''
  requestError.value = ''
  sent.value = false
  code.value = ''
}

function validateEmail() {
  emailError.value = ''
  if (emailInput.value.validity.valid) return true
  emailError.value = '请输入有效的邮箱地址。'
  emailInput.value.focus()
  return false
}

function readApiError(error, fallback) {
  return error.response?.data?.message || fallback
}

async function handleSend() {
  if (sending.value || verifying.value || cooldown.value || !validateEmail()) return
  requestError.value = ''
  codeError.value = ''
  sent.value = false
  sending.value = true
  try {
    const result = await sendCode({ email: email.value })
    const sentAt = Date.now()
    try { localStorage.setItem(cooldownKey, String(sentAt)) } catch {}
    startCooldown(sentAt)
    sent.value = true
    codeInput.value?.focus()
    emit('sent', { email: email.value, res: result })
  } catch (error) {
    requestError.value = readApiError(error, '验证码发送失败，请稍后重试。')
    emit('error', error)
  } finally {
    sending.value = false
  }
}

async function handleVerify() {
  if (sending.value || verifying.value || !validateEmail()) return
  codeError.value = ''
  requestError.value = ''
  if (!/^\d{6}$/.test(code.value)) {
    codeError.value = '请输入 6 位数字验证码。'
    codeInput.value.focus()
    return
  }

  verifying.value = true
  try {
    const result = await verifyCode({ email: email.value, code: code.value })
    if (!result?.user) {
      requestError.value = result?.message || '登录失败，请稍后重试。'
      return
    }
    code.value = ''
    emit('verified', result)
  } catch (error) {
    requestError.value = readApiError(error, '登录失败，请稍后重试。')
    emit('error', error)
  } finally {
    verifying.value = false
  }
}

defineExpose({
  focusEmail: () => emailInput.value?.focus(),
  clearCode() {
    code.value = ''
    codeError.value = ''
    requestError.value = ''
  }
})

onMounted(() => {
  try {
    const sentAt = Number(localStorage.getItem(cooldownKey))
    if (sentAt > 0) startCooldown(sentAt)
  } catch {}
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.login-form {
  --login-primary: var(--accent, #2563eb);
  --login-hover: var(--accent-hover, #1d4ed8);
  --login-border: var(--border, #dce2ec);
  color: var(--text, #17213b);
  padding: clamp(1rem, 4vw, 1.65rem);
}

.login-heading { margin-bottom: 1.35rem; padding-right: 2rem; }
.login-heading h2 { margin: 0; font-size: 1.45rem; line-height: 1.2; letter-spacing: -.025em; }
.login-heading p, .field-hint { color: var(--muted-2, #5c6b82); font-size: .81rem; line-height: 1.6; }
.login-heading p { margin: .45rem 0 0; }
.login-form form { display: grid; gap: 1rem; }
.login-field { min-width: 0; display: grid; gap: .4rem; }
.login-field label { color: var(--text, #17213b); font-size: .85rem; font-weight: 650; }
.login-field input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 45px;
  padding: .55rem .7rem;
  border: 1px solid var(--login-border);
  border-radius: 8px;
  background: var(--card, #fff);
  color: inherit;
  font-family: inherit;
  font-size: 1rem;
}
.login-field input::placeholder { color: var(--muted-2, #5c6b82); font-size: .85rem; }
.login-field input:focus { outline: 2px solid var(--login-primary); outline-offset: 1px; }
.login-field input[aria-invalid="true"] { border-color: #ba3d41; }
.code-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .5rem; }
.code-row input { font-variant-numeric: tabular-nums; }
.field-hint, .field-error { margin: 0; }
.field-error { color: #a82632; font-size: .81rem; }
.login-button {
  min-height: 44px;
  padding: .5rem .75rem;
  border: 1px solid transparent;
  border-radius: 8px;
  font: inherit;
  font-size: .85rem;
  font-weight: 650;
  cursor: pointer;
}
.login-button:focus-visible { outline: 2px solid var(--login-primary); outline-offset: 2px; }
.login-button:disabled { cursor: not-allowed; opacity: .62; }
.code-button { background: var(--accent-soft, #eff6ff); color: var(--login-primary); min-width: 104px; white-space: nowrap; }
.code-button:hover:not(:disabled) { border-color: var(--login-primary); }
.submit-button { background: var(--login-primary); color: #fff; }
.submit-button:hover:not(:disabled) { background: var(--login-hover); }
.login-feedback { margin: 0; border-radius: 8px; padding: .6rem .7rem; font-size: .82rem; line-height: 1.55; }
.login-feedback.is-success { background: #e8f6ef; color: #13634e; }
.login-feedback.is-error { background: #fceef0; color: #a82632; }
@media (max-width: 320px) {
  .code-button { min-width: 0; padding-inline: .45rem; }
}
</style>
