import request from '../utils/request'

export function getGroupList(params = {}, config = {}) {
  return request({
    url: '/api/irrigation-group/list',
    method: 'GET',
    params,
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent === true
  })
}

export function getGroupListByLandId(data) {
  return request({
    url: '/api/irrigation-group/items',
    method: 'GET',
    params: data
  })
}

/** 轮灌组详情 GET /api/irrigation-group/{id} */
export function getGroupDetail(id, config = {}) {
  return request({
    url: `/api/irrigation-group/${id}`,
    method: 'GET',
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent === true,
    loading: config.loading === true
  })
}

export function addGroup(data) {
  return request({
    url: '/api/irrigation-group',
    method: 'POST',
    data
  })
}

export function updateGroup(data) {
  return request({
    url: '/api/irrigation-group',
    method: 'PUT',
    data
  })
}

export function deleteGroup(id) {
  return request({
    url: `/api/irrigation-group/${id}`,
    method: 'DELETE'
  })
}

export function openAllWaterDv(data, config = {}) {
  return request({
    url: '/api/irrigation-group/batch-open',
    method: 'POST',
    data,
    silent: config.silent === true
  })
}

export function closeAllWaterDv(data, config = {}) {
  return request({
    url: '/api/irrigation-group/batch-close',
    method: 'POST',
    data,
    silent: config.silent === true
  })
}
