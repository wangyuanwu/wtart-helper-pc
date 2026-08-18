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

/** 添加设备前校验编号（对齐移动端 addCheck） */
export function addCheck(data, config = {}) {
  return request({
    url: '/api/device/add-check',
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

/** 启动北斗定位（对齐移动端 startPositon） */
export function startPositon(data, config = {}) {
  return request({
    url: '/api/water-outlet-pile/start-positioning',
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

/** 查询定位结果（对齐移动端 getPositon） */
export function getPositon(data, config = {}) {
  return request({
    url: '/api/water-outlet-pile/query-position',
    method: 'POST',
    data,
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent !== false,
    loading: config.loading === true
  })
}

/** 批量激活出水桩（对齐移动端 batchActivateDevice） */
export function batchActivateDevice(data, config = {}) {
  return request({
    url: '/api/water-outlet-pile/batch-activate',
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

/** 批量删除设备（对齐移动端 batchDelete） */
export function batchDeleteDevices(data, config = {}) {
  return request({
    url: '/api/device/batch-delete',
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

/** 出水桩设备状态（点击图标查询详情，不对齐农场轮询） */
export function getWaterOutletPileStatus(id, config = {}) {
  return request({
    url: `/api/water-outlet-pile/${id}/status`,
    method: 'GET',
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent === true,
    loading: config.loading === true
  })
}

/** 设置默认开度（对齐移动端 updateDefaultOpen） */
export function updateDefaultOpening(data, config = {}) {
  return request({
    url: '/api/water-outlet-pile/set-default-opening',
    method: 'PUT',
    data,
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent === true,
    loading: config.loading === true
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

/** 农场下正在定时/轮灌运行的出水桩（对齐移动端 getWaterOutetRuning） */
export function getWaterOutletRunning(params = {}, config = {}) {
  return request({
    url: '/api/water-outlet-pile/runing',
    method: 'GET',
    params,
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent !== false
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

/** 地块内设备排序（对齐移动端 deviceSort） */
export function deviceSort(data, config = {}) {
  return request({
    url: '/api/device/sort',
    method: 'PUT',
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

/** 出水桩扩展数据（对齐移动端 getWaterDvOtherData → /data） */
export function getWaterOutletPileData(id, config = {}) {
  return request({
    url: `/api/water-outlet-pile/${id}/data`,
    method: 'GET',
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent === true,
    loading: config.loading === true
  })
}

/** 设备状态历史曲线（对齐移动端 getDeviceStatusHistory） */
export function getDeviceStatusHistory(params = {}, config = {}) {
  return request({
    url: '/api/deviceStatusHistory/list',
    method: 'GET',
    params,
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent === true,
    loading: config.loading === true
  })
}
