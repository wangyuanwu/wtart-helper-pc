import request from '../utils/request'

/** 开关记录 GET /api/log（对齐移动端 getLog） */
export function getLog(params, config = {}) {
  return request({
    url: '/api/log',
    method: 'GET',
    params,
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent === true
  })
}
