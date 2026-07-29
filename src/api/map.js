import request from '../utils/request'

export function getFarmList(data) {
  return request({
    url: '/api/farm/list',
    method: 'GET',
    params: data,
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}

export function getFarmInfo(id) {
  return request({
    url: `/api/farm/${id}/full`,
    method: 'GET',
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}

export function getLandList(data) {
  return request({
    url: '/api/land-plot/by-farm',
    method: 'GET',
    params: data
  })
}

export function getLandDetail(data) {
  return request({
    url: '/api/land-plot',
    method: 'GET',
    params: data
  })
}

/** 删除地块 DELETE /api/land-plot/{id} */
export function deleteLand(id) {
  return request({
    url: `/api/land-plot/${id}`,
    method: 'DELETE',
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}
