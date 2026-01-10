/**
 * 格式化 ISO 8601 日期字符串为中文日期时间格式
 * @param {string} dateStr - ISO 8601 格式的日期字符串
 * @returns {string} 格式化后的中文日期时间，例如 "2026年01月10日 10:18"
 */
export function formatCreatedAt(dateStr) {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    return `${year}年${month}月${day}日 ${hours}:${minutes}`
  } catch (e) {
    console.error('日期格式化失败:', e)
    return ''
  }
}
