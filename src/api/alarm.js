import request from '../utils/request'

/** 告警记录列表 GET /api/alarm-record（对齐移动端 getAlarmList） */
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

/** 设为已处理 POST /api/alarm-record/handle（对齐移动端 handleAlarm） */
export function handleAlarm(data, config = {}) {
  return request({
    url: '/api/alarm-record/handle',
    method: 'POST',
    data,
    silent: config.silent === true
  })
}

/** 删除告警 DELETE /api/alarm-record/{id}（对齐移动端 deletedAlarm） */
export function deletedAlarm(id, config = {}) {
  return request({
    url: `/api/alarm-record/${id}`,
    method: 'DELETE',
    silent: config.silent === true
  })
}

/** 告警设置列表 GET /api/alarmSetting/list（对齐移动端 getAlarmSetList） */
export function getAlarmSetList(params = {}, config = {}) {
  return request({
    url: '/api/alarmSetting/list',
    method: 'GET',
    params,
    silent: config.silent === true
  })
}

/** 保存告警设置 POST /api/alarmSetting（对齐移动端 alarmSetting） */
export function alarmSetting(data, config = {}) {
  return request({
    url: '/api/alarmSetting',
    method: 'POST',
    data,
    silent: config.silent === true
  })
}
