/**
 * 将 /api/farm/{id}/full 返回数据加工为地图业务可用资源
 * 对齐移动端 map.vue getFarmInfoHttp 成功后的处理逻辑
 */
export function parseAreaJson(areaJson) {
  if (!areaJson) {
    return { landPoint: [], fillColor: '#2196F3' }
  }
  try {
    const areaObj =
      typeof areaJson === 'string' ? JSON.parse(areaJson) : areaJson
    return {
      landPoint: Array.isArray(areaObj?.landPoint) ? areaObj.landPoint : [],
      fillColor: areaObj?.fillColor || '#2196F3'
    }
  } catch (e) {
    console.warn('解析 areaJson 失败', e)
    return { landPoint: [], fillColor: '#2196F3' }
  }
}

/**
 * @param {object|null} fullData - GET /api/farm/{id}/full 的 data
 * @returns {{
 *   farmInfo: object|null,
 *   waterDvList: array,
 *   landList: array,
 *   landGroupList: array,
 *   hasNoLand: boolean
 * }}
 */
export function prepareFarmMapResources(fullData) {
  if (!fullData) {
    return {
      farmInfo: null,
      waterDvList: [],
      landList: [],
      landGroupList: [],
      hasNoLand: true
    }
  }

  const lands = Array.isArray(fullData.lands)
    ? fullData.lands.map((item) => ({ ...item }))
    : []
  const devices = Array.isArray(fullData.devices)
    ? fullData.devices.map((item) => ({ ...item }))
    : []
  const irrigationGroups = Array.isArray(fullData.irrigationGroups)
    ? fullData.irrigationGroups.map((item) => ({ ...item }))
    : []

  const totalAreaMu = lands
    .reduce((sum, land) => {
      const areaSqm = Number(land.area) || 0
      return sum + areaSqm / 666.67
    }, 0)
    .toFixed(2)
  const deviceCount = devices.length

  lands.forEach((land) => {
    land.deviceIds = []
  })
  devices.forEach((device) => {
    const targetLand = lands.find((land) => land.id === device.landId)
    if (targetLand) {
      targetLand.deviceIds.push(device.id)
    }
  })

  const farmInfo = {
    ...fullData,
    lands,
    devices,
    irrigationGroups,
    totalAreaMu,
    deviceCount
  }

  const waterDvList = devices

  const landList = lands.map((item) => {
    const areaObj = parseAreaJson(item.areaJson)
    const areaSqm = Number(item.area) || 0
    return {
      id: item.id,
      name: item.name,
      landPoint: areaObj.landPoint,
      fillColor: areaObj.fillColor,
      deviceIds: item.deviceIds || [],
      area: item.area,
      areaMu: areaSqm ? (areaSqm / 666.67).toFixed(2) : undefined
    }
  })

  const landGroupList = irrigationGroups
    .filter((item) => item.areaJson && item.areaJson !== '')
    .map((item) => {
      const areaObj = parseAreaJson(item.areaJson)
      return {
        id: item.id,
        name: item.name,
        landPoint: areaObj.landPoint,
        fillColor: areaObj.fillColor
      }
    })

  return {
    farmInfo,
    waterDvList,
    landList,
    landGroupList,
    hasNoLand: lands.length <= 0
  }
}
