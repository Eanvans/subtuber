<template>
  <div class="row justify-content-center">
    <div class="col-md-6 col-lg-4">
      <h3>通过邮箱登录 / 注册</h3>

      <div v-if="infoMessage" class="alert alert-info">{{ infoMessage }}</div>

      <form @submit.prevent="handleSend" novalidate>
        <div class="mb-3">
          <label for="emailSend" class="form-label">邮箱地址</label>
          <input id="emailSend" v-model="emailSend" class="form-control" autocomplete="email" />
          <div class="text-danger" v-if="errors.email">{{ errors.email }}</div>
          <div id="emailHelp" class="form-text">系统会向该邮箱发送 6 位验证码，验证码有效期 10 分钟。</div>
        </div>
        <button id="sendCodeBtn" :disabled="sending || cooldown>0" type="submit" class="btn btn-outline-primary w-100">
          <span v-if="cooldown>0">发送验证码 ({{ cooldown }}s)</span>
          <span v-else>发送验证码</span>
        </button>
      </form>

      <form @submit.prevent="handleVerify" novalidate class="mt-3">
        <div class="text-danger mb-3" v-if="Object.keys(formErrors).length">
          <div v-for="(v,k) in formErrors" :key="k">{{ v }}</div>
        </div>

        <input type="hidden" :value="email" />

        <div class="mb-3">
          <label for="code" class="form-label">验证码</label>
          <input id="code" v-model="code" class="form-control" autocomplete="one-time-code" />
          <div class="text-danger" v-if="errors.code">{{ errors.code }}</div>
        </div>

        <button id="verifyBtn" type="submit" class="btn btn-primary w-100">登录 / 注册</button>
      </form>

      <div class="mt-3 text-muted small">如果未收到邮件，请检查垃圾邮箱或稍后重试。</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { sendCode, verifyCode } from './index.js'

const props = defineProps({
  // 可选：父组件可以传入 initialEmail
  initialEmail: { type: String, default: '' }
})
const emit = defineEmits(['verified', 'sent', 'error'])

const emailSend = ref(props.initialEmail || '')
const email = ref(props.initialEmail || '')
const code = ref('')
const sending = ref(false)
const errors = reactive({ email: '', code: '' })
const formErrors = reactive({})
const infoMessage = ref('')

// cooldown logic (in seconds)
const COOLDOWN_KEY = 'login_send_at'
const COOLDOWN_SEC = 60
const cooldown = ref(0)
let iv = null

function startCooldown(sec) {
  cooldown.value = sec
  if (iv) clearInterval(iv)
  iv = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0) {
      clearInterval(iv)
      localStorage.removeItem(COOLDOWN_KEY)
    }
  }, 1000)
}

function syncEmailFields() {
  email.value = emailSend.value
}

async function handleSend() {
  errors.email = ''
  if (!emailSend.value || !emailSend.value.includes('@')) {
    errors.email = '请输入有效邮箱地址'
    return
  }
  sending.value = true
  try {
    const res = await sendCode({ email: emailSend.value })
    // 接口可以返回 message
    infoMessage.value = (res && res.message) || '验证码已发送'
    localStorage.setItem(COOLDOWN_KEY, Date.now().toString())
    startCooldown(COOLDOWN_SEC)
    syncEmailFields()
    emit('sent', { email: email.value, res })
  } catch (e) {
    emit('error', e)
    formErrors.general = e.message || '发送失败'
  } finally {
    sending.value = false
  }
}

async function handleVerify() {
  formErrors.general = ''
  errors.code = ''
  if (!code.value) {
    errors.code = '请输入验证码'
    return
  }
  try {
    const res = await verifyCode({ email: email.value || emailSend.value, code: code.value })
    emit('verified', res)
  } catch (e) {
    emit('error', e)
    formErrors.general = e.message || '验证失败'
  }
}

onMounted(() => {
  // 恢复倒计时
  const last = localStorage.getItem(COOLDOWN_KEY)
  if (last) {
    const diff = Math.floor((Date.now() - Number(last)) / 1000)
    const remaining = COOLDOWN_SEC - diff
    if (remaining > 0) startCooldown(remaining)
  }
})
</script>

<style scoped>
/* 保持简单，依赖宿主项目的样式（如 Bootstrap） */
</style>
