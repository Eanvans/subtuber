import { ref, computed } from 'vue'
import { logout as sharedLogout } from 'shared-auth'

const currentUser = ref(null)

// 初始化用户状态
try {
  const u = localStorage.getItem('UserInfo')
  currentUser.value = u ? JSON.parse(u) : null
} catch (e) {
  currentUser.value = null
}

export function useAuth() {
  const isLoggedIn = computed(() => !!currentUser.value)

  const setUser = (user) => {
    currentUser.value = user
    if (user) {
      try {
        localStorage.setItem('UserInfo', JSON.stringify(user))
      } catch (e) {
        console.error('Failed to save user to localStorage:', e)
      }
    } else {
      localStorage.removeItem('UserInfo')
    }
  }

  const logout = async () => {
    // 调用后端 API 清除服务器端的 session/cookie
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch (e) {
      console.error('Failed to call logout API:', e)
    }
    
    // 清除前端状态
    currentUser.value = null
    localStorage.removeItem('UserInfo')
    
    // 调用 shared-auth 的 logout 清除 token
    sharedLogout()
    
    // 清除 UserInfo Cookie
    const clearCookie = (name) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`
      if (window.location.hostname.includes('.')) {
        const domain = '.' + window.location.hostname.split('.').slice(-2).join('.')
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`
      }
    }
    clearCookie('UserInfo')
  }

  const getUser = () => currentUser.value

  return {
    currentUser,
    isLoggedIn,
    setUser,
    logout,
    getUser
  }
}
