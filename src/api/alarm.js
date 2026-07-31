import request from '../utils/request'

/** 告警记录列表（对齐移动端 getAlarmList） */
export function getAlarmList(params = {}, config = {}) {
  return request({
    url: '/api/alarm-record',
    method: 'GET',
    params,
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent === true
  })
}
