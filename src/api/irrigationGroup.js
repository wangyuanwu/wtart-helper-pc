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

/** 按地块分组的轮灌组列表 GET /api/irrigation-group/by-Land（对齐移动端 getGroupListLand） */
export function getGroupListByLand(params = {}, config = {}) {
  return request({
    url: '/api/irrigation-group/by-Land',
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

/** 轮灌组排序 PUT /api/irrigation-group/sort（对齐移动端 groupSort） */
export function groupSort(data, config = {}) {
  return request({
    url: '/api/irrigation-group/sort',
    method: 'PUT',
    data,
    silent: config.silent === true,
    loading: config.loading === true
  })
}

export function getWaterOutList(params = {}, config = {}) {
  return request({
    url: '/api/water-outlet-pile/port',
    method: 'GET',
    params,
    silent: config.silent === true
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

/** 均压状态 GET /api/irrigation-group/{id}/balance/status（对齐移动端 getBalancePress） */
export function getBalancePress(id, config = {}) {
  return request({
    url: `/api/irrigation-group/${id}/balance/status`,
    method: 'GET',
    silent: config.silent === true,
    loading: config.loading === true
  })
}

/** 开始均压 POST /api/irrigation-group/balance-pressure（对齐移动端 balancePressure） */
export function balancePressure(data, config = {}) {
  return request({
    url: '/api/irrigation-group/balance-pressure',
    method: 'POST',
    data,
    silent: config.silent === true
  })
}

/** 停止均压 POST /api/irrigation-group/balance-pressure/stop（对齐移动端 stopBalancePressure） */
export function stopBalancePressure(data, config = {}) {
  return request({
    url: '/api/irrigation-group/balance-pressure/stop',
    method: 'POST',
    data,
    silent: config.silent === true
  })
}

/** 更新均压最大压力 PUT /api/irrigation-group/balance/max-pressure（对齐移动端 updateBalanceMaxPressure） */
export function updateBalanceMaxPressure(data, config = {}) {
  return request({
    url: '/api/irrigation-group/balance/max-pressure',
    method: 'PUT',
    data,
    silent: config.silent === true
  })
}
