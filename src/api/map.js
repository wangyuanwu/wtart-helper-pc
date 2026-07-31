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

/** 新建农场 POST /api/farm */
export function addFarm(data) {
  return request({
    url: '/api/farm',
    method: 'POST',
    data,
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}

/** 新建地块 POST /api/land-plot */
export function addPlot(data) {
  return request({
    url: '/api/land-plot',
    method: 'POST',
    data,
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}

/** 更新地块 PUT /api/land-plot */
export function updateLand(data) {
  return request({
    url: '/api/land-plot',
    method: 'PUT',
    data,
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}

/** 地块详情 GET /api/land-plot/{id} */
export function getLandPlotById(id) {
  return request({
    url: `/api/land-plot/${id}`,
    method: 'GET',
    headers: {
      'X-Timezone': 'Asia/Shanghai'
    }
  })
}
