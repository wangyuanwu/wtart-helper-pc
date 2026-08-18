import request from '../utils/request'

export function login(data) {
  return request({
    url: '/api/login/login',
    method: 'POST',
    data,
    skipAuth: true
  })
}

/** 生成扫码登录二维码 GET /api/login/scan/qrcode */
export function createQrLoginTicket(config = {}) {
  return request({
    url: '/api/login/scan/qrcode',
    method: 'GET',
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    },
    skipAuth: true,
    ...config
  })
}

/**
 * 轮询扫码登录状态 GET /api/login/scan/status
 * status: 0 pending | 1 scanned | 2 confirmed | 3 expired
 * confirmed 时 data 含 accessToken / refreshToken
 */
export function getQrLoginStatus(ticket, config = {}) {
  return request({
    url: '/api/login/scan/status',
    method: 'GET',
    params: { ticket },
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    },
    skipAuth: true,
    silent: true,
    ...config
  })
}

export function sendCode(data) {
  return request({
    url: '/api/login/send-code',
    method: 'POST',
    data,
    skipAuth: true,
    loading: true
  })
}

export function logout(data) {
  return request({
    url: '/api/login/logout',
    method: 'POST',
    data,
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    },
    loading: true,
    loadingText: '退出中...'
  })
}

export function refreshToken(data) {
  return request({
    url: '/api/login/refresh',
    method: 'POST',
    data,
    skipAuth: true
  })
}

export function getUser() {
  return request({
    url: '/api/user',
    method: 'GET',
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}

/** 修改昵称 PUT /api/user/update-nick-name（对齐移动端 updateNickName） */
export function updateNickName(data, config = {}) {
  return request({
    url: '/api/user/update-nick-name',
    method: 'PUT',
    data,
    loading: true,
    loadingText: '提交中',
    ...config
  })
}

/** 上传头像 POST /api/user/avatar（对齐移动端 uni.uploadFile name=avatar） */
export function uploadAvatar(file, config = {}) {
  const formData = new FormData()
  formData.append('avatar', file)
  return request({
    url: '/api/user/avatar',
    method: 'POST',
    data: formData,
    loading: true,
    loadingText: '上传中',
    ...config
  })
}
