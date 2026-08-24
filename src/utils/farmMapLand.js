/**
 * 地块 Polygon / Text 绘制（对齐移动端 drawLandPolygon）
 * 本阶段只绘制图形，业务点击预留 logic_landClick 出口
 */
import { px2rem } from '@/utils/rem'

const LAND_MIN_SHOW_ZOOM = 13
const LAND_TEXT_ZOOMS = [16, 26]

const getLayerVisible = (layerOptions, value, defaultVisible = true) => {
  if (!Array.isArray(layerOptions) || !layerOptions.length) return defaultVisible
  const item = layerOptions.find((v) => v.value === value)
  return item ? !!item.isChose : defaultVisible
}

/** 多边形几何质心 */
export function getPolygonCenter(points) {
  let x = 0
  let y = 0
  let area = 0
  const len = points.length
  if (len < 3) {
    return points[0] ? [...points[0]] : [0, 0]
  }
  for (let i = 0; i < len; i++) {
    const j = (i + 1) % len
    const xi = points[i][0]
    const yi = points[i][1]
    const xj = points[j][0]
    const yj = points[j][1]
    const temp = xi * yj - xj * yi
    area += temp
    x += (xi + xj) * temp
    y += (yi + yj) * temp
  }
  area /= 2
  if (!area) {
    const sumX = points.reduce((s, p) => s + p[0], 0)
    const sumY = points.reduce((s, p) => s + p[1], 0)
    return [sumX / len, sumY / len]
  }
  x /= 6 * area
  y /= 6 * area
  return [x, y]
}

const calcAreaMu = (item, path) => {
  if (item.areaMu != null && item.areaMu !== '') {
    return Number(item.areaMu).toFixed(2)
  }
  if (item.area != null && item.area !== '') {
    return Number(item.area).toFixed(2)
  }
  try {
    const util = window.AMap?.GeometryUtil
    if (util?.ringArea && path?.length >= 3) {
      const areaSqm = Math.abs(util.ringArea(path))
      return (areaSqm / 666.67).toFixed(2)
    }
  } catch (e) {
    console.warn('[Map] 计算地块面积失败', e)
  }
  return '0.00'
}

/**
 * @param {{ onLandClick?: (landItem: object, index: number) => void }} hooks
 */
export function createLandPolygonDrawer(hooks = {}) {
  const landPolygonList = []
  const landTextList = []
  let selectedLandIndex = -1
  let layerShowState = { land: null }

  const clearAllLandPolygon = (map) => {
    landPolygonList.forEach((poly) => {
      try {
        if (map) map.remove(poly)
        else poly.setMap?.(null)
      } catch (e) {
        console.warn('[Map] 移除地块 Polygon 失败', e)
      }
    })
    landTextList.forEach((text) => {
      try {
        if (map) map.remove(text)
        else text.setMap?.(null)
      } catch (e) {
        console.warn('[Map] 移除地块 Text 失败', e)
      }
    })
    landPolygonList.length = 0
    landTextList.length = 0
    selectedLandIndex = -1
    layerShowState = { land: null }
  }

  const resetAllLandBorder = () => {
    selectedLandIndex = -1
    landPolygonList.forEach((poly) => {
      poly.setOptions({
        strokeColor: '#ffffff',
        strokeWeight: 1
      })
    })
  }

  const refreshLandLayerVisible = (map, layerOptions = [], force = false) => {
    if (!map) return
    const currentZoom = map.getZoom()
    const landBaseShow = getLayerVisible(layerOptions, 'land', true)
    // 图层勾选 + zoom >= 13 才显示（对齐图1 / 移动端）
    const landShow = landBaseShow && currentZoom >= LAND_MIN_SHOW_ZOOM

    if (!force && landShow === layerShowState.land) return
    layerShowState.land = landShow

    landPolygonList.forEach((poly) => {
      landShow ? poly.setMap(map) : poly.setMap(null)
    })
    landTextList.forEach((text) => {
      landShow ? text.setMap(map) : text.setMap(null)
    })
  }

  const drawLandPolygon = (map, landArr = [], options = {}) => {
    if (!map || typeof window.AMap === 'undefined') return
    clearAllLandPolygon(map)

    if (!Array.isArray(landArr) || !landArr.length) return

    const readOnly = !!options.readOnly

    landArr.forEach((item, index) => {
      if (!item?.landPoint?.length) return

      const path = item.landPoint
        .map((p) => {
          const lng = p.lng ?? p[0]
          const lat = p.lat ?? p[1]
          if (lng == null || lat == null) return null
          return [Number(lng), Number(lat)]
        })
        .filter(Boolean)

      if (path.length < 3) return

      const polygon = new window.AMap.Polygon({
        path,
        fillColor: item.fillColor || '#2196F3',
        fillOpacity: readOnly ? 0.3 : 0.1,
        strokeColor: readOnly ? '#ffffff' : '#ffffff',
        strokeWeight: readOnly ? 1 : 1,
        strokeOpacity: 0.5,
        zIndex: readOnly ? 10 : 100,
        clickable: !readOnly
      })
      polygon.setMap(map)
      landPolygonList.push(polygon)

      const areaMu = calcAreaMu(item, path)
      const center = getPolygonCenter(path)
      const label = new window.AMap.Text({
        position: center,
        text: `${item.name || '未命名'}(地块)<br>${areaMu} 亩`,
        anchor: 'center',
        zooms: LAND_TEXT_ZOOMS,
        style: {
          color: '#ffffff',
          fontSize: px2rem(14),
          fontWeight: '500',
          textAlign: 'center',
          verticalAlign: 'middle',
          backgroundColor: 'transparent',
          border: 'none',
          textShadow: '0 0 4px rgba(0,0,0,1), 0 1px 2px rgba(0,0,0,0.8)',
          lineHeight: px2rem(26),
          padding: '0'
        },
        zIndex: readOnly ? 11 : 101,
        clickable: !readOnly
      })
      label.setMap(map)
      landTextList.push(label)

      if (readOnly) return

      let clickHandled = false
      let lastClickTime = 0
      const handleClick = () => {
        const now = Date.now()
        if (now - lastClickTime < 100 || clickHandled) return
        clickHandled = true
        lastClickTime = now
        setTimeout(() => {
          clickHandled = false
        }, 100)

        resetAllLandBorder()
        selectedLandIndex = index
        polygon.setOptions({
          strokeColor: '#007aff',
          strokeWeight: 4
        })

        // 预留业务出口：地块弹窗等后续处理
        hooks.onLandClick?.(item, index)
      }

      polygon.on('click', handleClick)
      label.on('click', handleClick)
    })

    refreshLandLayerVisible(map, options.layerOptions, true)
  }

  const destroy = (map) => {
    clearAllLandPolygon(map)
  }

  return {
    landPolygonList,
    landTextList,
    get selectedLandIndex() {
      return selectedLandIndex
    },
    clearAllLandPolygon,
    resetAllLandBorder,
    drawLandPolygon,
    refreshLandLayerVisible,
    destroy
  }
}
