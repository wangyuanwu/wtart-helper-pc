/**
 * API `area` 字段单位为亩，格式化为展示用字符串
 */
export function formatAreaMu(area) {
  if (area == null || area === '') return undefined
  const num = Number(area)
  if (!Number.isFinite(num)) return undefined
  return num.toFixed(2)
}
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
    .reduce((sum, land) => sum + (Number(land.area) || 0), 0)
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
    return {
      id: item.id,
      name: item.name,
      landPoint: areaObj.landPoint,
      fillColor: areaObj.fillColor,
      deviceIds: item.deviceIds || [],
      area: item.area,
      areaMu: formatAreaMu(item.area)
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
        fillColor: areaObj.fillColor,
        area: item.area,
        areaMu: formatAreaMu(item.area)
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
