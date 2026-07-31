import request from '../utils/request'

/** 农场详情 GET /api/farm/{id}（对齐移动端 getFarmDetail） */
export function getFarmDetail(id) {
  return request({
    url: `/api/farm/${id}`,
    method: 'GET',
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}

/** 更新农场 PUT /api/farm */
export function updateFarm(data) {
  return request({
    url: '/api/farm',
    method: 'PUT',
    data,
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}

/** 删除农场 DELETE /api/farm/{id} */
export function deleteFarm(id) {
  return request({
    url: `/api/farm/${id}`,
    method: 'DELETE',
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}

/** 农场成员列表 GET /api/farm-user/by-farm */
export function getMemberList(params = {}, config = {}) {
  return request({
    url: '/api/farm-user/by-farm',
    method: 'GET',
    params,
    headers: {
      'X-Timezone': 'Asia/Shanghai',
      ...(config.headers || {})
    },
    silent: config.silent === true
  })
}

/** 成员详情 GET /api/farm-user/{id} */
export function getMemberInfo(id) {
  return request({
    url: `/api/farm-user/${id}`,
    method: 'GET',
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}

/** 添加成员 POST /api/farm-user */
export function addMember(data) {
  return request({
    url: '/api/farm-user',
    method: 'POST',
    data,
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}

/** 更新成员 PUT /api/farm-user */
export function updateMember(data) {
  return request({
    url: '/api/farm-user',
    method: 'PUT',
    data,
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}

/** 删除成员 DELETE /api/farm-user/{id} */
export function deleteMember(id) {
  return request({
    url: `/api/farm-user/${id}`,
    method: 'DELETE',
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}
