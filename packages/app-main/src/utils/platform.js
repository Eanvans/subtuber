/**
 * 格式化平台名称显示
 * @param {string} platform - 平台名称
 * @returns {string} 格式化后的平台名称
 */
export function formatPlatformName(platform) {
  if (!platform) return "未知平台"
  const key = platform.toLowerCase()
  if (key.includes("twitch")) return "Twitch"
  if (key.includes("youtube")) return "YouTube"
  return platform
}

/**
 * 格式化观看人数
 * @param {number} count - 观看人数
 * @returns {string} 格式化后的人数字符串
 */
export function formatViewerCount(count) {
  if (!count) return '0'
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K'
  }
  return count.toString()
}
