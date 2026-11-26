<template>
  <main class="workspace-width workspace-page">
    <header class="page-header">
      <h1>获取积分</h1>
    </header>

    <section class="surface balance-panel" aria-labelledby="balance-title">
      <div>
        <h2 id="balance-title">可用积分</h2>
        <template v-if="currentUser && wallet">
          <p class="balance-amount"><strong>{{ formatPoints(wallet.available_points) }}</strong> 积分</p>
          <p v-if="wallet.locked_points > 0" class="balance-hint">另有 {{ formatPoints(wallet.locked_points) }} 积分暂时锁定</p>
        </template>
        <p v-else class="balance-hint" role="status">
          {{ currentUser ? walletError || '正在读取余额…' : '登录后查看你的积分余额。' }}
        </p>
      </div>
      <button v-if="!currentUser" type="button" class="btn btn-primary btn-sm" @click="$emit('request-login')">登录</button>
      <button v-else type="button" class="btn btn-outline btn-sm" :disabled="walletLoading" @click="refreshWallet">刷新余额</button>
    </section>

    <section class="surface rewards-panel" aria-labelledby="points-rewards-title">
      <header class="points-section-header">
        <h2 id="points-rewards-title">如何获取积分</h2>
      </header>
      <ul class="reward-options">
        <li class="reward-option">
          <i class="bi bi-calendar-check reward-icon" aria-hidden="true"></i>
          <div>
            <h3>每日登录</h3>
            <p>北京时间每天首次登录后自动到账。</p>
          </div>
          <span v-if="rewards" class="reward-value">+{{ formatPoints(rewards.daily_login_points) }} 积分</span>
        </li>
        <li class="reward-option">
          <i class="bi bi-gift reward-icon" aria-hidden="true"></i>
          <div>
            <h3>首次登录</h3>
            <p>新账号首次登录时额外赠送一次。</p>
          </div>
          <span v-if="rewards" class="reward-value">+{{ formatPoints(rewards.new_user_welcome_points) }} 积分</span>
        </li>
      </ul>
      <div v-if="!rewards" class="rewards-status">
        <p role="status">{{ rewardsError ? '暂时无法读取奖励金额。' : '正在读取奖励金额…' }}</p>
        <button v-if="rewardsError" type="button" class="btn btn-outline btn-sm" @click="loadRewards">重试</button>
      </div>
    </section>

    <section class="surface recharge-panel" aria-labelledby="recharge-amount-title">
      <header class="points-section-header">
        <h2 id="recharge-amount-title">充值金额</h2>
        <p>线上充值暂未开放。</p>
      </header>
      <fieldset class="amount-options" aria-labelledby="recharge-amount-title">
        <label v-for="amount in presetAmounts" :key="amount" class="amount-option">
          <input v-model="selectedAmount" type="radio" name="recharge-amount" :value="amount">
          <span>{{ amount }} 元</span>
        </label>
        <label class="amount-option">
          <input v-model="selectedAmount" type="radio" name="recharge-amount" value="custom">
          <span>自定义</span>
        </label>
      </fieldset>
      <div v-if="selectedAmount === 'custom'" class="custom-amount">
        <label for="custom-recharge-amount">自定义金额（元）</label>
        <input
          id="custom-recharge-amount"
          v-model.trim="customAmount"
          class="input"
          type="text"
          inputmode="decimal"
          placeholder="例如 12.50"
          :aria-invalid="Boolean(customAmountError)"
          :aria-describedby="customAmountError ? 'custom-amount-hint custom-amount-error' : 'custom-amount-hint'"
        >
        <p id="custom-amount-hint" class="amount-hint">金额须大于 10 元，最多保留两位小数。</p>
        <p v-if="customAmountError" id="custom-amount-error" class="amount-error" role="status">{{ customAmountError }}</p>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getPointRewardRules } from '../api/streamers'
import { useAuth } from '../composables/useAuth'
import { formatPoints, usePointsWallet } from '../composables/usePointsWallet'

defineEmits(['request-login'])

const { currentUser } = useAuth()
const { wallet, walletLoading, walletError, refreshWallet } = usePointsWallet()
const rewards = ref(null)
const rewardsError = ref(false)
const presetAmounts = [5, 10, 15, 20]
const selectedAmount = ref(presetAmounts[0])
const customAmount = ref('')
const customAmountError = computed(() => {
  if (!customAmount.value) return ''
  if (!/^\d+(?:\.\d{1,2})?$/.test(customAmount.value) || !Number.isFinite(Number(customAmount.value))) {
    return '请输入有效金额，最多保留两位小数。'
  }
  return Number(customAmount.value) > 10 ? '' : '自定义金额必须大于 10 元。'
})

async function loadRewards() {
  rewardsError.value = false
  try {
    const result = await getPointRewardRules()
    const rules = result?.rewards
    if (!result?.success || !Number.isSafeInteger(rules?.daily_login_points)
      || !Number.isSafeInteger(rules?.new_user_welcome_points)) {
      throw new Error('无效的积分奖励规则')
    }
    rewards.value = rules
  } catch {
    rewardsError.value = true
  }
}

onMounted(loadRewards)
</script>

<style scoped>
.balance-panel, .points-section-header { padding: 1.2rem 1.25rem; }
.balance-panel { display: flex; align-items: center; justify-content: space-between; gap: .75rem; margin-bottom: 1rem; }
.balance-panel .btn { flex-shrink: 0; }
.balance-panel h2, .points-section-header h2 { margin: 0; font-size: 1.08rem; }
.balance-amount { margin: .45rem 0 0; color: var(--accent); font-size: .85rem; }
.balance-amount strong { font-size: 1.75rem; font-variant-numeric: tabular-nums; }
.balance-hint, .points-section-header p { margin: .4rem 0 0; color: var(--muted-2); font-size: .84rem; }
.points-section-header { border-bottom: 1px solid var(--border); }
.rewards-panel { margin-bottom: 1rem; }
.reward-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 315px), 1fr));
  gap: .75rem;
  padding: 1rem 1.25rem;
  margin: 0;
  list-style: none;
}
.reward-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: .65rem;
  padding: .8rem;
  border: 1px solid var(--border);
  border-radius: 9px;
}
.reward-icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 7px;
  color: var(--accent);
  background: var(--accent-soft);
}
.reward-option h3 { margin: 0; font-size: .9rem; }
.reward-option p { margin: .25rem 0 0; color: var(--muted-2); font-size: .8rem; }
.reward-value { color: var(--accent); font-size: .84rem; font-weight: 700; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.rewards-status { display: flex; align-items: center; gap: .75rem; padding: 0 1.25rem 1rem; }
.rewards-status p { margin: 0; color: var(--muted-2); font-size: .84rem; }
.amount-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 100px), 1fr));
  gap: .75rem;
  min-width: 0;
  margin: 0;
  padding: 1rem 1.25rem;
  border: 0;
}
.amount-option { position: relative; cursor: pointer; }
.amount-option input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.amount-option span {
  display: block;
  padding: .85rem .5rem;
  border: 1px solid var(--border);
  border-radius: 9px;
  font-size: .9rem;
  font-weight: 650;
  text-align: center;
}
.amount-option:hover span { border-color: var(--accent); }
.amount-option input:checked + span { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }
.amount-option input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: 2px; }
.custom-amount { width: min(100%, 320px); padding: 0 1.25rem 1.25rem; }
.custom-amount label { display: block; margin-bottom: .4rem; font-size: .85rem; font-weight: 650; }
.custom-amount .input { width: 100%; }
.amount-hint, .amount-error { margin: .4rem 0 0; font-size: .82rem; }
.amount-hint { color: var(--muted-2); }
.amount-error { color: #a13027; }
.custom-amount .input[aria-invalid="true"] { border-color: #a13027; }
</style>
