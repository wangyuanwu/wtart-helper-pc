import farmMarkerSelect from '@/assets/map/farm-marker-select.svg'
import farmMarkerNormal from '@/assets/map/farm-marker-normal.svg'
import { px2rem } from '@/utils/rem'

/** 农场 Marker 图标：选中=组4433，普通=组4434 */
export const FARM_MARKER_IMAGES = {
  select: farmMarkerSelect,
  normal: farmMarkerNormal
}

const DEFAULT_FARM_MARKER_SIZE = 45

const getLayerVisible = (layerOptions, value, defaultVisible = true) => {
  if (!Array.isArray(layerOptions) || !layerOptions.length) return defaultVisible
  const item = layerOptions.find((v) => v.value === value)
  return item ? !!item.isChose : defaultVisible
}

/**
 * 创建农场 Marker 绘制器，管理 marker 实例与防抖/并发控制
 * @param {{ onFarmClick?: (farmItem: object) => void }} hooks
 */
export function createFarmMarkerDrawer(hooks = {}) {
  const farmMarkers = []
  let isDrawingFarm = false
  let farmDrawTimer = null
  let layerShowState = { farm: true }

  const clearFarmMark = (map) => {
    if (!map) return
    farmMarkers.forEach((marker) => {
      try {
        map.remove(marker)
        const content = marker.getContent?.()
        content?.remove?.()
      } catch (e) {
        console.warn('[Map] 移除农场 Marker 失败', e)
      }
    })
    farmMarkers.length = 0
  }

  const resetAllFarmMarkers = (farmList, currentSelectFarmId) => {
    farmMarkers.forEach((marker, idx) => {
      const dom = marker.getContent?.()
      if (!dom) return

      const iconImg = dom.querySelector('.farm-marker-img')
      const infoCard = dom.querySelector('.farm-info-card')
      const farmItem = farmList[idx] || {}
      const isActive = farmItem.id === currentSelectFarmId

      marker.setzIndex(isActive ? 10000 : 9900)
      dom.style.zIndex = isActive ? '10000' : '9900'

      if (iconImg) {
        iconImg.src = isActive
          ? FARM_MARKER_IMAGES.select
          : FARM_MARKER_IMAGES.normal
      }
      dom.style.transform = isActive ? 'scale(1.1)' : 'scale(1)'
      if (infoCard) infoCard.style.display = 'none'
    })
  }

  const refreshFarmLayerVisible = (map, layerOptions = [], force = false) => {
    if (!map) return
    const farmShow = getLayerVisible(layerOptions, 'farm', true)
    if (!force && farmShow === layerShowState.farm) return

    layerShowState.farm = farmShow
    farmMarkers.forEach((marker) => {
      farmShow ? marker.setMap(map) : marker.setMap(null)
    })
  }

  const createFarmMarker = (map, farmItem, index, options = {}) => {
    if (!map || !farmItem) return null
    const { longitude, latitude } = farmItem
    if (longitude == null || latitude == null) return null

    const currentSelectFarmId = options.currentSelectFarmId
    const farmMarkerSize = options.farmMarkerSize || DEFAULT_FARM_MARKER_SIZE
    const isActive = farmItem.id === currentSelectFarmId
    const markerImg = isActive
      ? FARM_MARKER_IMAGES.select
      : FARM_MARKER_IMAGES.normal
    const initScale = isActive ? 'scale(1.1)' : 'scale(1)'

    const ICON_SIZE = farmMarkerSize
    const LABEL_GAP = 4
    const LABEL_FONT_SIZE = 14
    const ANCHOR_OFFSET_Y = 16

    const totalAreaMu = farmItem.totalAreaMu || '0.00'
    const deviceCount = farmItem.deviceCount ?? 0

    // 内联 style 需 px2rem，与弹窗等 CSS（postcss-pxtorem）同尺度
    const dom = document.createElement('div')
    dom.style.cssText = [
      'position:relative',
      `width:${px2rem(Math.max(ICON_SIZE, 120))}`,
      `height:${px2rem(ICON_SIZE + Math.abs(LABEL_GAP) + LABEL_FONT_SIZE)}`,
      'cursor:pointer',
      'transition:0.2s',
      'z-index:15000',
      `transform:${initScale}`,
      'transform-origin:center bottom',
      'display:flex !important',
      'flex-direction:column',
      'align-items:center',
      'overflow:visible !important',
      'pointer-events:auto !important',
      'touch-action:manipulation',
      'visibility:visible !important',
      'opacity:1 !important'
    ].join(';')

    const iconContainer = document.createElement('div')
    iconContainer.style.cssText = [
      'position:relative',
      `width:${px2rem(ICON_SIZE + 20)}`,
      `height:${px2rem(ICON_SIZE)}`,
      `margin-top:${px2rem(ANCHOR_OFFSET_Y)}`,
      `margin-bottom:${px2rem(LABEL_GAP)}`,
      'display:flex !important',
      'align-items:center',
      'justify-content:center',
      'visibility:visible !important'
    ].join(';')

    iconContainer.innerHTML = `
      <img class="farm-marker-img" src="${markerImg}" style="width:${px2rem(ICON_SIZE)};height:${px2rem(ICON_SIZE)};max-width:none;object-fit:contain;pointer-events:none;visibility:visible !important;display:block !important;">
      <div class="farm-info-card" style="display:none;position:absolute;bottom:110%;left:50%;transform:translateX(-50%);background:#fff;border-radius:${px2rem(6)};overflow:hidden;width:fit-content;white-space:nowrap;z-index:100000;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
        <div class="farm-info-card-title" style="background-color:#3377ff;color:#fff;font-size:${px2rem(12)};font-weight:bold;text-align:center;padding:${px2rem(5)} ${px2rem(12)};">
          ${isActive ? '当前农场' : farmItem.name || '未知农场'}
        </div>
        <div style="display:flex;justify-content:space-between;padding:${px2rem(6)} ${px2rem(12)};gap:${px2rem(16)};line-height:1.4;">
          <div style="font-size:${px2rem(12)};color:#333;">
            面积 <span class="farm-info-card-area" style="font-weight:600;">${totalAreaMu}亩</span>
          </div>
          <div style="font-size:${px2rem(12)};color:#333;">
            设备 <span class="farm-info-card-device" style="font-weight:600;">${deviceCount}个</span>
          </div>
        </div>
      </div>
    `
    dom.appendChild(iconContainer)

    const nameLabel = document.createElement('div')
    nameLabel.style.cssText = [
      'margin:0',
      'padding:0',
      'border:none',
      'background:transparent',
      `font-size:${px2rem(LABEL_FONT_SIZE)}`,
      'font-weight:500',
      'z-index:15000',
      'color:#ffffff',
      'white-space:nowrap',
      'text-align:center !important',
      `line-height:${px2rem(LABEL_FONT_SIZE)} !important`,
      `height:${px2rem(LABEL_FONT_SIZE)} !important`,
      'text-shadow:0 0 4px rgba(0,0,0,1), 0 1px 2px rgba(0,0,0,0.8)',
      'letter-spacing:0.5px',
      'pointer-events:none',
      'visibility:visible !important'
    ].join(';')
    nameLabel.textContent = farmItem.name || '未知农场'
    dom.appendChild(nameLabel)

    const marker = new window.AMap.Marker({
      position: [longitude, latitude],
      content: dom,
      anchor: 'bottom-center',
      zIndex: isActive ? 10000 : 9900,
      draggable: false,
      clickable: true,
      visible: true
    })
    marker.__farmId = farmItem.id

    iconContainer.addEventListener('click', (e) => {
      e.stopImmediatePropagation()
      e.preventDefault()

      resetAllFarmMarkers(options.farmList || [], currentSelectFarmId)

      const clickScale =
        farmItem.id === currentSelectFarmId ? 'scale(1.2)' : 'scale(1.1)'
      marker.setzIndex(100000)
      dom.style.zIndex = '100000'
      dom.style.transform = clickScale

      const infoCard = dom.querySelector('.farm-info-card')
      if (infoCard) infoCard.style.display = 'block'

      hooks.onFarmClick?.(farmItem)
    })

    marker.setMap(map)
    return marker
  }

  /** 更新指定农场轻量信息卡标题/面积/设备数 */
  const updateFarmInfoCard = (farmId, payload = {}) => {
    const marker = farmMarkers.find(
      (m) => String(m.__farmId) === String(farmId)
    )
    if (!marker) return
    const dom = marker.getContent?.()
    if (!dom) return

    const titleEl = dom.querySelector('.farm-info-card-title')
    const areaEl = dom.querySelector('.farm-info-card-area')
    const deviceEl = dom.querySelector('.farm-info-card-device')

    if (titleEl && payload.title != null) {
      titleEl.textContent = payload.title
    }
    if (areaEl && payload.totalAreaMu != null) {
      areaEl.textContent = `${payload.totalAreaMu}亩`
    }
    if (deviceEl && payload.deviceCount != null) {
      deviceEl.textContent = `${payload.deviceCount}个`
    }
    if (payload.visible) {
      const infoCard = dom.querySelector('.farm-info-card')
      if (infoCard) infoCard.style.display = 'block'
    }
  }

  const showFarmInfoCard = (farmId) => {
    updateFarmInfoCard(farmId, { visible: true })
  }

  const hideAllFarmInfoCards = () => {
    farmMarkers.forEach((marker) => {
      const dom = marker.getContent?.()
      const infoCard = dom?.querySelector('.farm-info-card')
      if (infoCard) infoCard.style.display = 'none'
    })
  }

  const drawAllFarmMarker = (map, farmList = [], options = {}) => {
    if (!map) return

    if (isDrawingFarm) {
      console.log('[Map] 农场绘制中，跳过重复调用')
      return
    }

    if (farmDrawTimer) {
      clearTimeout(farmDrawTimer)
    }

    farmDrawTimer = setTimeout(() => {
      isDrawingFarm = true

      try {
        const uniqueFarmMap = new Map()
        farmList.forEach((item) => {
          if (item?.longitude == null || item?.latitude == null) return
          const key = `${item.id}-${item.longitude}-${item.latitude}`
          if (!uniqueFarmMap.has(key)) {
            uniqueFarmMap.set(key, item)
          }
        })
        const uniqueFarmList = Array.from(uniqueFarmMap.values())

        clearFarmMark(map)
        if (!uniqueFarmList.length) return

        const drawOptions = {
          ...options,
          farmList: uniqueFarmList
        }

        uniqueFarmList.forEach((item, idx) => {
          const marker = createFarmMarker(map, item, idx, drawOptions)
          if (marker) farmMarkers.push(marker)
        })

        refreshFarmLayerVisible(map, options.layerOptions, true)
      } finally {
        isDrawingFarm = false
      }
    }, 200)
  }

  const destroy = (map) => {
    if (farmDrawTimer) {
      clearTimeout(farmDrawTimer)
      farmDrawTimer = null
    }
    clearFarmMark(map)
    isDrawingFarm = false
    layerShowState = { farm: true }
  }

  return {
    farmMarkers,
    clearFarmMark,
    createFarmMarker,
    drawAllFarmMarker,
    resetAllFarmMarkers,
    refreshFarmLayerVisible,
    updateFarmInfoCard,
    showFarmInfoCard,
    hideAllFarmInfoCards,
    destroy
  }
}
