import request from '../utils/request'

export function login(data) {
  return request({
    url: '/api/login/login',
    method: 'POST',
    data,
    skipAuth: true
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
    data
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
