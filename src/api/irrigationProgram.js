import request from '../utils/request'

export function getGroupProList(data) {
  return request({
    url: '/api/irrigation-program/page',
    method: 'GET',
    params: data
  })
}

export function getProDetail(id) {
  return request({
    url: `/api/irrigation-program/${id}`,
    method: 'GET'
  })
}

export function addGroupPro(data) {
  return request({
    url: '/api/irrigation-program',
    method: 'POST',
    data
  })
}

export function updateGroupPro(data) {
  return request({
    url: '/api/irrigation-program',
    method: 'PUT',
    data
  })
}

export function deleteGroupPro(id) {
  return request({
    url: `/api/irrigation-program/${id}`,
    method: 'DELETE'
  })
}

export function openGroupPro(data) {
  return request({
    url: '/api/irrigation-program/open',
    method: 'POST',
    data
  })
}

export function enableGroupPro(data) {
  return request({
    url: '/api/irrigation-program/enable',
    method: 'POST',
    data
  })
}
