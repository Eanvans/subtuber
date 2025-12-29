import axios from 'axios'

// 一个非常小的共享认证模块，包含 token 存取和一个简单的登录封装。
// 目的：演示如何在多个前端项目间复用登录逻辑。

const TOKEN_KEY = 'subtuber_token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch (e) {
    return null
  }
}

export function setToken(token) {
  try {
    if (token === null || token === undefined) {
      localStorage.removeItem(TOKEN_KEY)
    } else {
      localStorage.setItem(TOKEN_KEY, token)
    }
  } catch (e) {
    // ignore
  }
}

export async function login({ username, password, url = '/api/login' }) {
  // 这是一个示例实现，真实项目请替换为后端实际接口
  const res = await axios.post(url, { username, password })
  // 假设返回 { token: '...' }
  if (res && res.data && res.data.token) {
    setToken(res.data.token)
    return res.data
  }
  return res
}

export function logout() {
  setToken(null)
}

export default {
  getToken,
  setToken,
  login,
  logout
}
