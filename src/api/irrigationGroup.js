import request from '../utils/request'

export function getGroupList(data) {
  return request({
    url: '/api/irrigation-group/list',
    method: 'GET',
    params: data
  })
}

export function getGroupListByLandId(data) {
  return request({
    url: '/api/irrigation-group/items',
    method: 'GET',
    params: data
  })
}

export function getGroupDetail(data) {
  return request({
    url: '/api/irrigation-group',
    method: 'GET',
    params: data
  })
}

export function addGroup(data) {
  return request({
    url: '/api/irrigation-group',
    method: 'POST',
    data
  })
}

export function updateGroup(data) {
  return request({
    url: '/api/irrigation-group',
    method: 'PUT',
    data
  })
}

export function deleteGroup(id) {
  return request({
    url: `/api/irrigation-group/${id}`,
    method: 'DELETE'
  })
}

export function openAllWaterDv(data) {
  return request({
    url: '/api/irrigation-group/batch-open',
    method: 'POST',
    data
  })
}

export function closeAllWaterDv(data) {
  return request({
    url: '/api/irrigation-group/batch-close',
    method: 'POST',
    data
  })
}
