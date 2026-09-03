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

/** 地块下可选步骤：阀门组 + 阀门，对齐移动端 getStepItems */
export function getStepItems(params) {
  return request({
    url: '/api/irrigation-program/step-items',
    method: 'GET',
    params
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

/** 轮灌程序运行记录 GET /api/irrigation-program/record */
export function getProgramRecord(params, config = {}) {
  return request({
    url: '/api/irrigation-program/record',
    method: 'GET',
    params,
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent === true
  })
}

/** 运行记录步骤详情 GET /api/irrigation-program/record/detail/{id} */
export function getProgramRecordDetail(id) {
  return request({
    url: `/api/irrigation-program/record/detail/${id}`,
    method: 'GET'
  })
}

/** 阀门执行明细 GET /api/irrigation-program/record/valve-execution/{id} */
export function getProgramRecordValveExecution(id) {
  return request({
    url: `/api/irrigation-program/record/valve-execution/${id}`,
    method: 'GET'
  })
}
