<template>
  <div class="login-root">
    <div class="login-card">
      <div class="login-header">
        <h3 class="login-title">通过邮箱登录 / 注册</h3>
      </div>

      <div v-if="infoMessage" class="info">{{ infoMessage }}</div>

      <form @submit.prevent="handleSend" novalidate>
        <div class="form-group">
          <label for="emailSend" class="form-label">邮箱地址</label>
          <input
            id="emailSend"
            v-model="emailSend"
            class="form-control"
            autocomplete="email"
          />
          <div class="error" v-if="errors.email">{{ errors.email }}</div>
          <div id="emailHelp" class="small-muted">
            系统会向该邮箱发送 6 位验证码，有效期 10 分钟
          </div>
        </div>

        <div class="form-actions">
          <button
            id="sendCodeBtn"
            :disabled="sending || cooldown > 0"
            type="submit"
            class="btn btn-outline-primary btn-block"
          >
            <span v-if="cooldown > 0">发送验证码 ({{ cooldown }}s)</span>
            <span v-else>发送验证码</span>
          </button>
        </div>
      </form>

      <div class="divider" aria-hidden></div>

      <form @submit.prevent="handleVerify" novalidate>
        <div class="form-errors" v-if="Object.keys(formErrors).length">
          <div v-for="(v, k) in formErrors" :key="k" class="error">{{ v }}</div>
        </div>

        <!-- 显示邮箱以提示用户（只读） -->

        <div class="form-group">
          <label for="code" class="form-label">验证码</label>
          <input
            id="code"
            v-model="code"
            class="form-control"
            autocomplete="one-time-code"
          />
          <div class="error" v-if="errors.code">{{ errors.code }}</div>
        </div>

        <div class="form-actions">
          <button
            id="verifyBtn"
            type="submit"
            class="btn btn-primary btn-block"
          >
            登录 / 注册
          </button>
        </div>
      </form>

      <div class="hint">如果未收到邮件，请检查垃圾邮箱或稍后重试。</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { sendCode, verifyCode } from "./index.js";

const props = defineProps({
  // 可选：父组件可以传入 initialEmail
  initialEmail: { type: String, default: "" },
});
const emit = defineEmits(["verified", "sent", "error"]);

const emailSend = ref(props.initialEmail || "");
const email = ref(props.initialEmail || "");
const code = ref("");
const sending = ref(false);
const errors = reactive({ email: "", code: "" });
const formErrors = reactive({});
const infoMessage = ref("");

// cooldown logic (in seconds)
const COOLDOWN_KEY = "login_send_at";
const COOLDOWN_SEC = 60;
const cooldown = ref(0);
let iv = null;

function startCooldown(sec) {
  cooldown.value = sec;
  if (iv) clearInterval(iv);
  iv = setInterval(() => {
    cooldown.value--;
    if (cooldown.value <= 0) {
      clearInterval(iv);
      localStorage.removeItem(COOLDOWN_KEY);
    }
  }, 1000);
}

function syncEmailFields() {
  email.value = emailSend.value;
}

async function handleSend() {
  errors.email = "";
  formErrors.general = '';
  infoMessage.value = '';
  if (!emailSend.value || !emailSend.value.includes("@")) {
    errors.email = "请输入有效邮箱地址";
    return;
  }
  sending.value = true;
  try {
    const res = await sendCode({ email: emailSend.value });
    // 接口可以返回 message
    infoMessage.value = (res && res.message) || "验证码已发送";
    localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
    startCooldown(COOLDOWN_SEC);
    syncEmailFields();
    emit("sent", { email: email.value, res });
  } catch (e) {
    emit("error", e);
    // 显示通用提示，不暴露完整错误信息
    infoMessage.value = '发送失败，稍后再试';
  } finally {
    sending.value = false;
  }
}

async function handleVerify() {
  formErrors.general = "";
  errors.code = "";
  if (!code.value) {
    errors.code = "请输入验证码";
    return;
  }
  try {
    const res = await verifyCode({
      email: email.value || emailSend.value,
      code: code.value,
    });
    emit("verified", res);
  } catch (e) {
    emit("error", e);
    formErrors.general = e.message || "验证失败";
  }
}

onMounted(() => {
  // 恢复倒计时
  const last = localStorage.getItem(COOLDOWN_KEY);
  if (last) {
    const diff = Math.floor((Date.now() - Number(last)) / 1000);
    const remaining = COOLDOWN_SEC - diff;
    if (remaining > 0) startCooldown(remaining);
  }
});
</script>

<style scoped>
/* Modernized, self-contained styles for the login card */
.login-root {
  display: flex;
  justify-content: center;
  padding: 1rem;
}
.login-card {
  width: 100%;
  max-width: 480px;
  background: var(--card, #ffffff);
  padding: 1.25rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(16, 24, 40, 0.08);
  border: 1px solid rgba(16, 24, 40, 0.04);
}
.login-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.login-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text, #111827);
}
.login-sub {
  font-size: 0.85rem;
  color: #6b7280;
}
.info {
  background: rgba(99, 102, 241, 0.08);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  margin-bottom: 12px;
  color: #3730a3;
}
.form-group {
  margin-bottom: 0.85rem;
}
.form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.95rem;
  color: var(--muted, #374151);
}
.form-control {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  border: 1px solid #e6e7eb;
  background: var(--input-bg, #fff);
  transition: box-shadow 0.12s, border-color 0.12s;
  box-sizing: border-box;
}
.form-control:focus {
  outline: none;
  box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.06);
  border-color: #3b82f6;
}
.form-control.muted {
  background: #f9fafb;
  color: #6b7280;
}
.form-errors {
  margin-bottom: 8px;
}
.error {
  color: #ef4444;
  font-size: 0.9rem;
  margin-top: 6px;
}
.small-muted {
  color: #6b7280;
  font-size: 0.85rem;
  margin-top: 6px;
}
.divider {
  height: 1px;
  background: rgba(16, 24, 40, 0.04);
  margin: 14px 0;
  border-radius: 2px;
}
.form-actions {
  margin-top: 8px;
}
.btn-block {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
}
.btn {
  font-weight: 600;
}
.btn-primary {
  background: #2563eb;
  color: #fff;
  border: none;
}
.btn-outline-primary {
  background: transparent;
  border: 1px solid #2563eb;
  color: #2563eb;
}
.hint {
  margin-top: 12px;
  color: #6b7280;
  font-size: 0.9rem;
}

@media (max-width: 420px) {
  .login-card {
    padding: 1rem;
  }
  .login-title {
    font-size: 1rem;
  }
}
</style>
