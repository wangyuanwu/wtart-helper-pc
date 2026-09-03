import request from '../utils/request'

function getClientTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
  } catch {
    return 'Asia/Shanghai'
  }
}

/** 开关记录 GET /api/log（对齐移动端 getLog） */
export function getLog(params, config = {}) {
  return request({
    url: '/api/log',
    method: 'GET',
    params,
    headers: {
      'X-Timezone': getClientTimeZone(),
      ...(config.headers || {})
    },
    silent: config.silent === true
  })
}
