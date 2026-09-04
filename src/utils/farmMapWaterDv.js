import outletOnlineIcon from '@/assets/map/outlet-online.svg'
import outletOfflineIcon from '@/assets/map/outlet-offline.svg'
import outletOnlineActiveIcon from '@/assets/map/outlet-online-active.svg'
import outletOfflineActiveIcon from '@/assets/map/outlet-offline-active.svg'
import { px2rem } from '@/utils/rem'

/** 出水桩在线/离线图标（普通态 + 选中放大态 _01） */
export const WATER_DV_MARKER_IMAGES = {
  online: outletOnlineIcon,
  offline: outletOfflineIcon,
  onlineActive: outletOnlineActiveIcon,
  offlineActive: outletOfflineActiveIcon
}

const DEFAULT_MARKER_SIZE = 48
const WATER_DV_MIN_SHOW_ZOOM = 13
const DOT_SIZE = 14
const DOT_FONT_SIZE = 10
const COLOR_UNSELECTED = '#888888'
const COLOR_SELECTED = '#007aff'
const COLOR_TEXT = '#ffffff'

const getLayerVisible = (layerOptions, value, defaultVisible = true) => {
  if (!Array.isArray(layerOptions) || !layerOptions.length) return defaultVisible
  const item = layerOptions.find((v) => v.value === value)
  return item ? !!item.isChose : defaultVisible
}

const getPorts = (dv) => {
  const ports = dv?.specificData?.waterOutletPile?.ports
  return Array.isArray(ports) ? ports : []
}

const buildInfoCardHtml = (dv) => {
  const ports = getPorts(dv)

  if (!ports.length) {
    return `<div style="text-align:center;line-height:1.8;color:#999;">暂无出水口数据</div>`
  }

  const portsHtml = ports
    .map((port) => {
      const openVal = port.currentOpening ?? 0
      const pressVal = port.pressure ?? 0
      const iconBg = openVal > 0 ? COLOR_SELECTED : COLOR_UNSELECTED
      return `
        <div style="display:flex;align-items:center;gap:${px2rem(6)};line-height:1.8;">
          <div style="width:${px2rem(DOT_SIZE)};height:${px2rem(DOT_SIZE)};border-radius:50%;background-color:${iconBg};color:${COLOR_TEXT};font-size:${px2rem(DOT_FONT_SIZE)};font-weight:600;display:flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 0 3px rgba(0,0,0,1);border:1px solid #fff;flex-shrink:0;">${port.outletName || ''}</div>
          <span style="font-size:${px2rem(12)};">${openVal}% &nbsp; ${pressVal}bar</span>
        </div>`
    })
    .join('')

  return portsHtml
}

const getPortPositionMap = () => {
  const DOT_GAP = 3
  const dotOffset = -(DOT_SIZE + DOT_GAP)
  const dotOffsetY = -2
  return {
    1: {
      top: '0',
      left: '0',
      transform: `translateX(${px2rem(dotOffset)}) translateY(${px2rem(dotOffsetY)})`
    },
    2: {
      top: '0',
      right: '0',
      transform: `translateX(${px2rem(-dotOffset)}) translateY(${px2rem(dotOffsetY)})`
    },
    3: {
      bottom: '0',
      left: '0',
      transform: `translateX(${px2rem(dotOffset)}) translateY(${px2rem(-dotOffsetY)})`
    },
    4: {
      bottom: '0',
      right: '0',
      transform: `translateX(${px2rem(-dotOffset)}) translateY(${px2rem(-dotOffsetY)})`
    }
  }
}

const rebuildPortDots = (rotateWrap, ports) => {
  if (!rotateWrap) return
  Array.from(rotateWrap.children).forEach((child) => {
    if (child.tagName === 'DIV') child.remove()
  })
  const portPositionMap = getPortPositionMap()
  ;(ports || []).forEach((port) => {
    const position = portPositionMap[port.outletNo]
    if (!position) return
    const portDot = document.createElement('div')
    const bgColor =
      (port.currentOpening ?? 0) > 0 ? COLOR_SELECTED : COLOR_UNSELECTED
    portDot.style.cssText = [
      'position:absolute',
      `width:${px2rem(DOT_SIZE)}`,
      `height:${px2rem(DOT_SIZE)}`,
      'border-radius:50%',
      `background-color:${bgColor}`,
      `color:${COLOR_TEXT}`,
      `font-size:${px2rem(DOT_FONT_SIZE)}`,
      'font-weight:600',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'line-height:1',
      'z-index:10',
      `top:${position.top || 'auto'}`,
      `left:${position.left || 'auto'}`,
      `right:${position.right || 'auto'}`,
      `bottom:${position.bottom || 'auto'}`,
      `transform:${position.transform}`,
      'box-shadow:0 0 3px rgba(0,0,0,1)',
      'border:1px solid #fff',
      'pointer-events:none'
    ].join(';')
    portDot.textContent = port.outletName || ''
    rotateWrap.appendChild(portDot)
  })
}

/**
 * 出水桩 Marker 绘制器（对齐移动端 drawAllWaterDvMarker / createWaterDvMarker）
 * 本阶段只绘制图形，业务点击/绘制完成预留出口
 * @param {{
 *   onWaterDvClick?: (payload: { index: number, device: object }) => void,
 *   onWaterDvDrawFinish?: () => void
 * }} hooks
 */
export function createWaterDvMarkerDrawer(hooks = {}) {
  const waterDvMarkers = []
  let layerShowState = { waterDv: null }
  let activeWaterDvId = null

  const clearWaterDvMark = (map) => {
    waterDvMarkers.forEach((marker) => {
      try {
        if (map) map.remove(marker)
        else marker.setMap?.(null)
        const content = marker.getContent?.()
        content?.remove?.()
      } catch (e) {
        console.warn('[Map] 移除出水桩 Marker 失败', e)
      }
    })
    waterDvMarkers.length = 0
    layerShowState = { waterDv: null }
    activeWaterDvId = null
  }

  const resetAllWaterDvMarkers = () => {
    activeWaterDvId = null
    waterDvMarkers.forEach((marker) => {
      const dom = marker.getContent?.()
      if (!dom) return
      marker.setzIndex(20000)
      dom.style.zIndex = '20000'
      dom.style.transform = 'scale(1)'
      const img = dom.querySelector('.device-marker-image')
      if (img?.dataset?.normalSrc) {
        img.src = img.dataset.normalSrc
      }
      const card = dom.querySelector('.device-info-popup')
      if (card) card.style.display = 'none'
    })
  }

  const refreshWaterDvLayerVisible = (
    map,
    layerOptions = [],
    force = false
  ) => {
    if (!map) return
    const currentZoom = map.getZoom()
    const dvBaseShow = getLayerVisible(layerOptions, 'waterDv', true)
    const dvShow = dvBaseShow && currentZoom >= WATER_DV_MIN_SHOW_ZOOM

    if (!force && dvShow === layerShowState.waterDv) return
    layerShowState.waterDv = dvShow

    waterDvMarkers.forEach((marker) => {
      dvShow ? marker.setMap(map) : marker.setMap(null)
    })
  }

  /** 对齐移动端 updateSingleWaterDvMarkerDom：增量刷新图标/出水口圆点/信息卡 */
  const updateSingleWaterDvMarkerDom = (marker, dv, options = {}) => {
    const dom = marker?.getContent?.()
    if (!dom || !dv) return

    const isOnline = !!dv.isOnline
    const normalSrc = isOnline
      ? WATER_DV_MARKER_IMAGES.online
      : WATER_DV_MARKER_IMAGES.offline
    const activeSrc = isOnline
      ? WATER_DV_MARKER_IMAGES.onlineActive
      : WATER_DV_MARKER_IMAGES.offlineActive

    const img = dom.querySelector('.device-marker-image')
    if (img) {
      img.dataset.normalSrc = normalSrc
      img.dataset.activeSrc = activeSrc
      const isActive = String(dv.id) === String(activeWaterDvId)
      img.src = isActive ? activeSrc : normalSrc
    }

    const rotateWrap = img?.parentElement
    rebuildPortDots(rotateWrap, getPorts(dv))

    const infoCard = dom.querySelector('.device-info-popup')
    if (infoCard) {
      infoCard.innerHTML = buildInfoCardHtml(dv)
      if (String(dv.id) === String(activeWaterDvId)) {
        infoCard.style.display = 'block'
        dom.style.transform = 'scale(1.1)'
        marker.setzIndex(999999)
        dom.style.zIndex = '999999'
      }
    }

    const nameLabel = dom.querySelector('.device-info-card')
    if (nameLabel && dv.name) {
      nameLabel.textContent = dv.name
    }

    if (dv.orientationAngle != null && rotateWrap) {
      const calibratedAngle = Number(dv.orientationAngle) - 45
      rotateWrap.style.transform = `rotate(${calibratedAngle}deg)`
    }

    options.onUpdated?.(dv)
  }

  /**
   * 对齐移动端 refreshWaterDvMarkerStatus
   * @param {array} waterDvList
   * @param {{ activeDvId?: string|number|null, map?: object, layerOptions?: array }} options
   */
  const refreshWaterDvMarkerStatus = (waterDvList = [], options = {}) => {
    if (!waterDvMarkers.length || !waterDvList?.length) return
    if (options.activeDvId !== undefined) {
      activeWaterDvId = options.activeDvId
    }

    waterDvList.forEach((dv) => {
      const marker = waterDvMarkers.find(
        (m) => String(m.__waterDvId) === String(dv.id)
      )
      if (!marker) return
      updateSingleWaterDvMarkerDom(marker, dv)
    })

    if (options.map) {
      refreshWaterDvLayerVisible(options.map, options.layerOptions, false)
    }
  }

  const createWaterDvMarker = (map, dv, index) => {
    if (!map || !dv) return null
    const { longitude, latitude } = dv
    if (longitude == null || latitude == null) return null

    const MARKER_SIZE = DEFAULT_MARKER_SIZE
    const LABEL_FONT_SIZE = 14
    const ICON_LABEL_GAP = 2
    const isOnline = !!dv.isOnline
    const iconSrc = isOnline
      ? WATER_DV_MARKER_IMAGES.online
      : WATER_DV_MARKER_IMAGES.offline
    const iconActiveSrc = isOnline
      ? WATER_DV_MARKER_IMAGES.onlineActive
      : WATER_DV_MARKER_IMAGES.offlineActive
    const calibratedAngle = dv.orientationAngle
      ? Number(dv.orientationAngle) - 45
      : 0

    const ports = getPorts(dv)

    // 内联 style 需 px2rem，与弹窗等 CSS（postcss-pxtorem）同尺度
    const dom = document.createElement('div')
    dom.style.cssText = [
      'position:relative',
      `width:${px2rem(Math.max(MARKER_SIZE, 120))}`,
      'height:auto',
      `min-height:${px2rem(MARKER_SIZE + LABEL_FONT_SIZE + ICON_LABEL_GAP)}`,
      'cursor:pointer',
      'transform:scale(1)',
      'transform-origin:center bottom',
      'transition:0.2s',
      'z-index:20000',
      'overflow:visible !important',
      'background:transparent !important',
      'pointer-events:auto !important',
      'touch-action:manipulation',
      'display:flex',
      'flex-direction:column',
      'align-items:center'
    ].join(';')

    const iconContainer = document.createElement('div')
    iconContainer.style.cssText = [
      'position:relative',
      `width:${px2rem(MARKER_SIZE + 20)}`,
      `height:${px2rem(MARKER_SIZE + 20)}`,
      `margin-bottom:${px2rem(ICON_LABEL_GAP)}`,
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'overflow:visible'
    ].join(';')

    const rotateWrap = document.createElement('div')
    rotateWrap.style.cssText = [
      'position:relative',
      `width:${px2rem(MARKER_SIZE)}`,
      `height:${px2rem(MARKER_SIZE)}`,
      `transform:rotate(${calibratedAngle}deg)`,
      'transform-origin:center center',
      'pointer-events:none'
    ].join(';')

    const iconImg = document.createElement('img')
    iconImg.className = 'device-marker-image'
    iconImg.src = iconSrc
    iconImg.dataset.normalSrc = iconSrc
    iconImg.dataset.activeSrc = iconActiveSrc
    iconImg.alt = ''
    iconImg.style.cssText = [
      `width:${px2rem(MARKER_SIZE)}`,
      `height:${px2rem(MARKER_SIZE)}`,
      'max-width:none',
      'object-fit:contain',
      'display:block',
      'pointer-events:none'
    ].join(';')
    rotateWrap.appendChild(iconImg)

    // 出水口小圆点（对齐移动端图形）
    rebuildPortDots(rotateWrap, ports)

    iconContainer.appendChild(rotateWrap)

    // 信息卡 DOM 预留（点击显示；后续业务弹窗可复用）
    const infoCard = document.createElement('div')
    infoCard.className = 'device-info-popup'
    infoCard.style.cssText = [
      'display:none',
      'position:absolute',
      'bottom:110%',
      'left:50%',
      'transform:translateX(-50%)',
      'background:#fff',
      `border-radius:${px2rem(8)}`,
      `padding:${px2rem(8)} ${px2rem(10)}`,
      'box-shadow:0 2px 8px rgba(0,0,0,0.15)',
      'width:fit-content',
      'white-space:nowrap',
      `font-size:${px2rem(12)}`,
      'z-index:999999',
      'color:#333'
    ].join(';')
    infoCard.innerHTML = buildInfoCardHtml(dv)
    iconContainer.appendChild(infoCard)

    dom.appendChild(iconContainer)

    const nameLabel = document.createElement('div')
    nameLabel.className = 'device-info-card'
    nameLabel.style.cssText = [
      'margin:0',
      'padding:0',
      'border:none',
      'background:transparent',
      `font-size:${px2rem(LABEL_FONT_SIZE)}`,
      'font-weight:500',
      'color:#ffffff',
      'white-space:nowrap',
      'text-align:center',
      `line-height:${px2rem(LABEL_FONT_SIZE)}`,
      `height:${px2rem(LABEL_FONT_SIZE)}`,
      'text-shadow:0 0 4px rgba(0,0,0,1), 0 1px 2px rgba(0,0,0,0.8)',
      'letter-spacing:0.5px',
      'pointer-events:none'
    ].join(';')
    nameLabel.textContent = dv.name || '未知设备'
    dom.appendChild(nameLabel)

    const marker = new window.AMap.Marker({
      position: [longitude, latitude],
      content: dom,
      anchor: 'bottom-center',
      zIndex: 20000,
      draggable: false,
      clickable: true,
      visible: true
    })
    marker.__waterDvId = dv.id

    iconContainer.addEventListener('click', (e) => {
      e.stopImmediatePropagation()
      e.preventDefault()

      resetAllWaterDvMarkers()
      activeWaterDvId = dv.id
      marker.setzIndex(999999)
      dom.style.zIndex = '999999'
      dom.style.transform = 'scale(1.1)'
      iconImg.src = iconActiveSrc
      infoCard.style.display = 'block'

      // 预留业务出口：写 Store / 弹窗控制等
      hooks.onWaterDvClick?.({ index, device: dv })
    })

    marker.setMap(map)
    return marker
  }

  const drawAllWaterDvMarker = (map, waterDvList = [], options = {}) => {
    if (!map || typeof window.AMap === 'undefined') return

    clearWaterDvMark(map)
    if (!Array.isArray(waterDvList) || !waterDvList.length) {
      hooks.onWaterDvDrawFinish?.()
      return
    }

    waterDvList.forEach((item, idx) => {
      const marker = createWaterDvMarker(map, item, idx)
      if (marker) waterDvMarkers.push(marker)
    })

    refreshWaterDvLayerVisible(map, options.layerOptions, true)
    hooks.onWaterDvDrawFinish?.()
  }

  const destroy = (map) => {
    clearWaterDvMark(map)
  }

  return {
    waterDvMarkers,
    clearWaterDvMark,
    createWaterDvMarker,
    drawAllWaterDvMarker,
    resetAllWaterDvMarkers,
    refreshWaterDvLayerVisible,
    refreshWaterDvMarkerStatus,
    updateSingleWaterDvMarkerDom,
    destroy
  }
}
