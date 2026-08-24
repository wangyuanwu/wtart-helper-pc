/**
 * 轮灌组 Polygon / Text 绘制（对齐移动端 drawLandGroupPolygon）
 * 本阶段只绘制图形，业务点击预留 logic_landGroupClick 出口
 */
import { getPolygonCenter } from '@/utils/farmMapLand'
import { px2rem } from '@/utils/rem'

const GROUP_MIN_SHOW_ZOOM = 13
const GROUP_TEXT_ZOOMS = [15, 26]

/** 描边样式独立于填充色 */
const GROUP_STROKE_DEFAULT = '#ffffff'
const GROUP_STROKE_DEFAULT_WEIGHT = 1
const GROUP_STROKE_ACTIVE = '#28a745'
const GROUP_STROKE_ACTIVE_WEIGHT = 4

const getLayerVisible = (layerOptions, value, defaultVisible = true) => {
  if (!Array.isArray(layerOptions) || !layerOptions.length) return defaultVisible
  const item = layerOptions.find((v) => v.value === value)
  return item ? !!item.isChose : defaultVisible
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
    console.warn('[Map] 计算轮灌组面积失败', e)
  }
  return '0.00'
}

/**
 * @param {{ onLandGroupClick?: (groupItem: object, index: number) => void }} hooks
 */
export function createLandGroupPolygonDrawer(hooks = {}) {
  const landGroupPolygonList = []
  const landGroupTextList = []
  let selectedLandGroupIndex = -1
  let layerShowState = { group: null }

  const clearAllLandGroupPolygon = (map) => {
    landGroupPolygonList.forEach((poly) => {
      try {
        if (map) map.remove(poly)
        else poly.setMap?.(null)
      } catch (e) {
        console.warn('[Map] 移除轮灌组 Polygon 失败', e)
      }
    })
    landGroupTextList.forEach((text) => {
      try {
        if (map) map.remove(text)
        else text.setMap?.(null)
      } catch (e) {
        console.warn('[Map] 移除轮灌组 Text 失败', e)
      }
    })
    landGroupPolygonList.length = 0
    landGroupTextList.length = 0
    selectedLandGroupIndex = -1
    layerShowState = { group: null }
  }

  const resetAllLandGroupBorder = () => {
    selectedLandGroupIndex = -1
    landGroupPolygonList.forEach((poly) => {
      poly.setOptions({
        strokeColor: GROUP_STROKE_DEFAULT,
        strokeWeight: GROUP_STROKE_DEFAULT_WEIGHT
      })
    })
  }

  const refreshLandGroupLayerVisible = (
    map,
    layerOptions = [],
    force = false
  ) => {
    if (!map) return
    const currentZoom = map.getZoom()
    const groupBaseShow = getLayerVisible(layerOptions, 'group', true)
    // 图层勾选 + zoom >= 13（对齐图1）
    const groupShow = groupBaseShow && currentZoom >= GROUP_MIN_SHOW_ZOOM

    if (!force && groupShow === layerShowState.group) return
    layerShowState.group = groupShow

    landGroupPolygonList.forEach((poly) => {
      groupShow ? poly.setMap(map) : poly.setMap(null)
    })
    landGroupTextList.forEach((text) => {
      groupShow ? text.setMap(map) : text.setMap(null)
    })
  }

  const drawLandGroupPolygon = (map, groupArr = [], options = {}) => {
    if (!map || typeof window.AMap === 'undefined') return
    clearAllLandGroupPolygon(map)

    if (!Array.isArray(groupArr) || !groupArr.length) return

    groupArr.forEach((item, index) => {
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
        fillOpacity: 0.6,
        strokeColor: GROUP_STROKE_DEFAULT,
        strokeWeight: GROUP_STROKE_DEFAULT_WEIGHT,
        strokeOpacity: 0.5,
        zIndex: 100,
        clickable: true
      })
      polygon.setMap(map)
      landGroupPolygonList.push(polygon)

      const areaMu = calcAreaMu(item, path)
      const center = getPolygonCenter(path)
      const label = new window.AMap.Text({
        position: center,
        text: `${item.name || '未命名'}(轮灌组)<br>${areaMu} 亩`,
        anchor: 'center',
        zooms: GROUP_TEXT_ZOOMS,
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
        zIndex: 101,
        clickable: true
      })
      label.setMap(map)
      landGroupTextList.push(label)

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

        resetAllLandGroupBorder()
        selectedLandGroupIndex = index
        polygon.setOptions({
          strokeColor: GROUP_STROKE_ACTIVE,
          strokeWeight: GROUP_STROKE_ACTIVE_WEIGHT
        })

        // 预留业务出口：弹窗 / Store 等后续处理
        hooks.onLandGroupClick?.(item, index)
      }

      polygon.on('click', handleClick)
      label.on('click', handleClick)
    })

    refreshLandGroupLayerVisible(map, options.layerOptions, true)
  }

  const destroy = (map) => {
    clearAllLandGroupPolygon(map)
  }

  return {
    landGroupPolygonList,
    landGroupTextList,
    get selectedLandGroupIndex() {
      return selectedLandGroupIndex
    },
    clearAllLandGroupPolygon,
    resetAllLandGroupBorder,
    drawLandGroupPolygon,
    refreshLandGroupLayerVisible,
    destroy
  }
}
