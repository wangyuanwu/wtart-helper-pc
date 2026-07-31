import request from '../utils/request'

export function getDeviceList(data) {
  return request({
    url: '/api/device/list',
    method: 'GET',
    params: data
  })
}

/** 按地块分组的设备列表（对齐移动端 geLandDviceList） */
export function getDeviceGroupByLands(params = {}, config = {}) {
  return request({
    url: '/api/device/group-by-lands',
    method: 'GET',
    params,
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent === true
  })
}

export function getDeviceDetail(id) {
  return request({
    url: `/api/device/${id}`,
    method: 'GET'
  })
}

export function addDevice(data) {
  return request({
    url: '/api/device/add',
    method: 'POST',
    data
  })
}

export function updateDevice(data) {
  return request({
    url: '/api/device',
    method: 'PUT',
    data
  })
}

export function deleteDevice(id) {
  return request({
    url: `/api/device/${id}`,
    method: 'DELETE'
  })
}

/** 出水桩设备状态（点击图标查询详情，不对齐农场轮询） */
export function getWaterOutletPileStatus(id) {
  return request({
    url: `/api/water-outlet-pile/${id}/status`,
    method: 'GET',
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}

/** 农场下出水桩最新状态（对齐移动端 getFarmDeviceStatus / status-by-farm） */
export function getFarmWaterOutletStatus(farmId) {
  return request({
    url: '/api/water-outlet-pile/status-by-farm',
    method: 'GET',
    params: { farmId },
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}

/** 立即同步出水桩状态（对齐移动端 syncStatus） */
export function syncWaterOutletStatus(params = {}, config = {}) {
  return request({
    url: '/api/water-outlet-pile/sync-status',
    method: 'GET',
    params,
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent === true
  })
}

/** 打开出水口（对齐移动端 openWaterDv） */
export function openWaterDv(data, config = {}) {
  return request({
    url: '/api/water-outlet-pile/turn-on',
    method: 'POST',
    data,
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent === true,
    loading: config.loading === true
  })
}

/** 关闭出水口（对齐移动端 closeWaterDv） */
export function closeWaterDv(data, config = {}) {
  return request({
    url: '/api/water-outlet-pile/turn-off',
    method: 'POST',
    data,
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent === true,
    loading: config.loading === true
  })
}

/** 退出手动模式等（对齐移动端 closeRestartDv） */
export function closeRestartDv(data, config = {}) {
  return request({
    url: '/api/water-outlet-pile/set-dev',
    method: 'POST',
    data,
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent === true,
    loading: config.loading === true
  })
}
