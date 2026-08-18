import request from '../utils/request'

/** 灌溉汇总 GET /api/IrrigationRecord/summary（对齐移动端 getIrrSummary） */
export function getIrrSummary(params, config = {}) {
  return request({
    url: '/api/IrrigationRecord/summary',
    method: 'GET',
    params,
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    },
    ...config
  })
}

/** 灌溉记录列表 GET /api/IrrigationRecord/list（对齐移动端 getIrrRecordList） */
export function getIrrRecordList(params, config = {}) {
  return request({
    url: '/api/IrrigationRecord/list',
    method: 'GET',
    params,
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    },
    ...config
  })
}
