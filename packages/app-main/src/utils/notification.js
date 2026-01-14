/**
 * 显示全局通知
 * @param {string} message - 通知消息内容
 */
export function showNotification(message) {
  // 触发全局事件，让 App.vue 或父组件显示通知
  window.dispatchEvent(new CustomEvent('show-notification', { detail: { message } }))
}
