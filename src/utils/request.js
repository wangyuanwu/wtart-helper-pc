import axios from 'axios'
import { ElMessage, ElLoading } from 'element-plus'
import { storeToRefs } from 'pinia'
import { useUserStore } from '../store/user.js'

const service = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || '',
  timeout: 60000
})

let loadingInstance = null

const sendMessage = function () {
  if (sendMessage._called) return
  sendMessage._called = true

  try {
    const userStore = useUserStore()
    userStore.logOut()
  } catch (e) {
    console.log('[sendMessage] 调用 logOut 失败:', e)
  }

  ElMessage({
    type: 'warning',
    message: '登录已过期，请重新登录！'
  })

  setTimeout(() => {
    window.location.reload()
  }, 500)
}

let authTimer = null

service.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {}
    config.headers.AppName = 'WaterHelper'
    config.headers['Accept-Language'] = 'zh-CN'

    if (!config.skipAuth) {
      const userStore = useUserStore()
      const { token } = storeToRefs(userStore)
      const authToken = token.value || localStorage.getItem('token')
      if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`
      }
    }

    if (config.loading) {
      loadingInstance = ElLoading.service({
        target: 'body',
        text: config.loadingText || '加载中...',
        background: config.loadingBackground || 'rgba(122, 122, 122, 0.8)'
      })
    }

    return config
  },
  (err) => Promise.reject(err)
)

service.interceptors.response.use(
  (response) => {
    if (response.config.loading && loadingInstance) {
      loadingInstance.close()
    }

    return new Promise((resolve, reject) => {
      if (response.status === 200) {
        const data = response.data
        if (data.code === 200) {
          resolve(data)
        } else {
          const errorMsg = data.message || data.err || data.msg || ''
          const isAuthError =
            data.code === 40023 ||
            data.code === 10002 ||
            errorMsg.includes('身份异常') ||
            errorMsg.includes('登录已过期') ||
            errorMsg.includes('未登录') ||
            errorMsg.includes('token无效')

          if (isAuthError) {
            sendMessage()
            reject(data)
          } else if (!response.config.silent) {
            ElMessage.error(errorMsg || '请求失败')
            reject(data)
          } else {
            reject(data)
          }
        }
      } else {
        ElMessage.error(response.message || response.data?.message || '请求失败')
        reject(response.data)
      }
    })
  },
  (error) => {
    const { response } = error
    if (response?.config?.loading && loadingInstance) {
      loadingInstance.close()
    }

    const errorMsg = response?.data?.message || response?.data?.msg || ''
    if (
      response?.status === 401 ||
      errorMsg.includes('登录已过期') ||
      errorMsg.includes('身份异常') ||
      errorMsg.includes('未登录') ||
      errorMsg.includes('token无效')
    ) {
      if (authTimer) clearTimeout(authTimer)
      authTimer = setTimeout(sendMessage, 300)
      return Promise.reject(error)
    }

    ElMessage.error(errorMsg || '网络错误')
    return Promise.reject(error)
  }
)

export default service
