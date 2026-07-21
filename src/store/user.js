import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useFarmStore } from './farm'

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const refreshToken = ref('')
  const userInfo = ref({})
  const menus = ref([])

  function setToken(value) {
    token.value = value
  }

  function setRefreshToken(value) {
    refreshToken.value = value
  }

  function setUserInfo(value) {
    userInfo.value = value || {}
    localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
  }

  function setMenus(value) {
    menus.value = Array.isArray(value) ? value : []
  }

  function setAuth({ accessToken, refreshToken: refresh }) {
    setToken(accessToken || '')
    setRefreshToken(refresh || '')
  }

  function logOut() {
    token.value = ''
    refreshToken.value = ''
    userInfo.value = {}
    menus.value = []
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('menus')
    try {
      useFarmStore().resetFarm()
    } catch (e) {
      // ignore
    }
  }

  return {
    token,
    refreshToken,
    userInfo,
    menus,
    setToken,
    setRefreshToken,
    setUserInfo,
    setMenus,
    setAuth,
    logOut
  }
}, {
  persist: true
})
