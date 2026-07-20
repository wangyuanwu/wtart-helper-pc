import request from '../utils/request'

export function getDeviceList(data) {
  return request({
    url: '/api/device/list',
    method: 'GET',
    params: data
  })
}

export function getDeviceDetail(id) {
  return request({
    url: `/api/device/${id}`,
    method: 'GET'
  })
}

export function addDevice(data) {
  return request({
    url: '/api/device/add',
    method: 'POST',
    data
  })
}

export function updateDevice(data) {
  return request({
    url: '/api/device',
    method: 'PUT',
    data
  })
}

export function deleteDevice(id) {
  return request({
    url: `/api/device/${id}`,
    method: 'DELETE'
  })
}
