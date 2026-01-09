import { ref, computed } from 'vue'

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

  const logout = () => {
    currentUser.value = null
    localStorage.removeItem('UserInfo')
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
