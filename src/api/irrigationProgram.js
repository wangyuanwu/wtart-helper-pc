import request from '../utils/request'

export function getGroupProList(data, config = {}) {
  return request({
    url: '/api/irrigation-program/page',
    method: 'GET',
    params: data,
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent === true
  })
}

export function getProDetail(id) {
  return request({
    url: `/api/irrigation-program/${id}`,
    method: 'GET'
  })
}

export function addGroupPro(data) {
  return request({
    url: '/api/irrigation-program',
    method: 'POST',
    data
  })
}

export function updateGroupPro(data) {
  return request({
    url: '/api/irrigation-program',
    method: 'PUT',
    data
  })
}

export function deleteGroupPro(id) {
  return request({
    url: `/api/irrigation-program/${id}`,
    method: 'DELETE'
  })
}

export function openGroupPro(data, config = {}) {
  return request({
    url: '/api/irrigation-program/open',
    method: 'POST',
    data,
    silent: config.silent === true
  })
}

export function enableGroupPro(data, config = {}) {
  return request({
    url: '/api/irrigation-program/enable',
    method: 'POST',
    data,
    silent: config.silent === true
  })
}

/** 停止轮灌程序 POST /api/irrigation-program/stop */
export function closeGroupPro(data, config = {}) {
  return request({
    url: '/api/irrigation-program/stop',
    method: 'POST',
    data,
    silent: config.silent === true
  })
}
