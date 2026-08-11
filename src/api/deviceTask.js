import request from '../utils/request'

/** 定时任务列表 GET /api/device_task/list（对齐移动端 getTimeProList） */
export function getTimeProList(params, config = {}) {
  return request({
    url: '/api/device_task/list',
    method: 'GET',
    params,
    silent: config.silent === true
  })
}

/** 启用/禁用定时任务 POST /api/device_task/enable（对齐移动端 enableTimePro） */
export function enableTimePro(data, config = {}) {
  return request({
    url: '/api/device_task/enable',
    method: 'POST',
    data,
    silent: config.silent === true
  })
}

/** 停止定时任务 POST /api/device_task/stop（对齐移动端 stopDvTask） */
export function stopDvTask(data, config = {}) {
  return request({
    url: '/api/device_task/stop',
    method: 'POST',
    data,
    silent: config.silent === true
  })
}

/** 新增定时任务 POST /api/device_task（对齐移动端 addTimePro） */
export function addTimePro(data, config = {}) {
  return request({
    url: '/api/device_task',
    method: 'POST',
    data,
    silent: config.silent === true
  })
}

/** 更新定时任务 PUT /api/device_task（对齐移动端 updateTimePro） */
export function updateTimePro(data, config = {}) {
  return request({
    url: '/api/device_task',
    method: 'PUT',
    data,
    silent: config.silent === true
  })
}

/** 删除定时任务 DELETE /api/device_task/{id}（对齐移动端 deleteTimePro） */
export function deleteTimePro(id, config = {}) {
  return request({
    url: `/api/device_task/${id}`,
    method: 'DELETE',
    silent: config.silent === true
  })
}
