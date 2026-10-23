import outletOnlineIcon from '@/assets/map/outlet-online.svg'
import outletOfflineIcon from '@/assets/map/outlet-offline.svg'
import outletOnlineActiveIcon from '@/assets/map/outlet-online-active.svg'
import outletOfflineActiveIcon from '@/assets/map/outlet-offline-active.svg'
/** 对齐移动端 water_helper 地图 Marker 资源（已从 CDN 落地到本地） */
import markerBgNormal from '@/assets/map/dv_bg_n.png'
import markerBgActive from '@/assets/map/dv_bg_s.png'
import outletPortOnline from '@/assets/map/dv_on.png'
import outletPortOffline from '@/assets/map/dv_off.png'
import fertilizerFaOn from '@/assets/map/fa_on.png'
import fertilizerFaOff from '@/assets/map/fa_off.png'
import { px2rem } from '@/utils/rem'

/**
 * 出水桩编辑页等仍用本地 SVG（普通态 + 选中放大态）
 * 主地图 Marker 已对齐移动端：底图 + dv_on/dv_off / fa_on/fa_off
 */
export const WATER_DV_MARKER_IMAGES = {
  online: outletOnlineIcon,
  offline: outletOfflineIcon,
  onlineActive: outletOnlineActiveIcon,
  offlineActive: outletOfflineActiveIcon
}

/** 主地图设备 Marker 图标（对齐移动端 map.vue） */
export const DEVICE_MARKER_IMAGES = {
  bgNormal: markerBgNormal,
  bgActive: markerBgActive,
  outletOn: outletPortOnline,
  outletOff: outletPortOffline,
  fertilizerOn: fertilizerFaOn,
  fertilizerOff: fertilizerFaOff
}

/** @deprecated 兼容旧引用，等同 DEVICE_MARKER_IMAGES */
export const DEVICE_MARKER_CDN = DEVICE_MARKER_IMAGES

const FISMART_DEVICE_TYPE = 52
const DEFAULT_MARKER_SIZE = 48
const WATER_DV_MIN_SHOW_ZOOM = 13
const DOT_SIZE = 14
const DOT_FONT_SIZE = 10
const COLOR_UNSELECTED = '#888888'
const COLOR_SELECTED = '#007aff'
const COLOR_TEXT = '#ffffff'
const ARROW_OFFSET_X = 0
const ARROW_OFFSET_Y = -3

/** 对齐移动端 isFertilizerDevice：type === 52 */
export function isFertilizerDevice(dv) {
  return Number(dv?.type) === FISMART_DEVICE_TYPE
}

/** 对齐移动端 normalizeAngle */
function normalizeAngle(angle) {
  const num = Number(angle) || 0
  return ((num % 360) + 360) % 360
}

const getLayerVisible = (layerOptions, value, defaultVisible = true) => {
  if (!Array.isArray(layerOptions) || !layerOptions.length) return defaultVisible
  const item = layerOptions.find((v) => v.value === value)
  return item ? !!item.isChose : defaultVisible
}

const getPorts = (dv) => {
  const ports = dv?.specificData?.waterOutletPile?.ports
  return Array.isArray(ports) ? ports : []
}

/** 对齐移动端：出水桩中心图标按端口数分支（资源当前同为 dv_on/dv_off） */
function getOutletArrowSrc(dv) {
  const online = !!dv?.isOnline
  return online ? DEVICE_MARKER_IMAGES.outletOn : DEVICE_MARKER_IMAGES.outletOff
}

function getFertilizerArrowSrc(dv) {
  return dv?.isOnline
    ? DEVICE_MARKER_IMAGES.fertilizerOn
    : DEVICE_MARKER_IMAGES.fertilizerOff
}

/**
 * 对齐移动端 rotateContainer 定位：
 * left/top 50% + translate(-50%,-50%) 居中，再用 px 微调（勿把 rem 塞进 calc(-50%+…)
 * 否则部分环境下 transform 失效，图标会落在背景右下角）
 */
function getRotateTransform(angleDeg) {
  return `translate(-50%, -50%) translate(${ARROW_OFFSET_X}px, ${ARROW_OFFSET_Y}px) rotate(${angleDeg}deg)`
}

const buildOutletInfoCardHtml = (dv) => {
  const ports = getPorts(dv)

  if (!ports.length) {
    return `<div style="text-align:center;line-height:1.8;color:#999;">暂无出水口数据</div>`
  }

  return ports
    .map((port) => {
      const openVal = Number(port.currentOpening ?? 0).toFixed(0)
      const pressVal = Number(port.pressure ?? 0).toFixed(2)
      const iconBg = (port.currentOpening ?? 0) > 0 ? COLOR_SELECTED : COLOR_UNSELECTED
      return `
        <div style="display:flex;align-items:center;gap:${px2rem(6)};line-height:1.8;">
          <div style="width:${px2rem(DOT_SIZE)};height:${px2rem(DOT_SIZE)};border-radius:50%;background-color:${iconBg};color:${COLOR_TEXT};font-size:${px2rem(DOT_FONT_SIZE)};font-weight:600;display:flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 0 3px rgba(0,0,0,1);border:1px solid #fff;flex-shrink:0;">${port.outletName || ''}</div>
          <span style="font-size:${px2rem(12)};">${openVal}% &nbsp; ${pressVal}bar</span>
        </div>`
    })
    .join('')
}

/** 对齐移动端施肥机信息卡：名称 + 设备编码 */
const buildFertilizerInfoCardHtml = (dv) => {
  const name = dv?.name || '施肥机'
  const code = dv?.deviceCode || '--'
  return `
    <div style="line-height:1.8;">
      <div style="font-size:${px2rem(12)};font-weight:600;">${name}</div>
      <div style="font-size:${px2rem(11)};color:#666;">编码：${code}</div>
    </div>`
}

const buildInfoCardHtml = (dv) =>
  isFertilizerDevice(dv)
    ? buildFertilizerInfoCardHtml(dv)
    : buildOutletInfoCardHtml(dv)

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
 * 对齐移动端 applyDeviceMarkerIconState：
 * 底图按选中态；施肥机中心图标按 isOnline 切 fa_on/fa_off
 */
const applyDeviceMarkerIconState = (dom, dv, isActive) => {
  if (!dom || !dv) return
  const bgImg = dom.querySelector('.device-marker-image')
  const arrowImg = dom.querySelector('.device-arrow-image')
  if (bgImg) {
    bgImg.src = isActive
      ? DEVICE_MARKER_IMAGES.bgActive
      : DEVICE_MARKER_IMAGES.bgNormal
  }
  if (arrowImg && isFertilizerDevice(dv)) {
    arrowImg.src = getFertilizerArrowSrc(dv)
  }
}

/**
 * 设备 Marker 绘制器（对齐移动端 drawAllWaterDvMarker / createWaterDvMarker）
 * type=52 施肥机 / 其他出水桩，同一 DOM 结构，按类型分支图标与端口圆点
 */
export function createWaterDvMarkerDrawer(hooks = {}) {
  const waterDvMarkers = []
  let layerShowState = { waterDv: null, fismart: null }
  let activeWaterDvId = null

  const clearWaterDvMark = (map) => {
    waterDvMarkers.forEach((marker) => {
      try {
        if (map) map.remove(marker)
        else marker.setMap?.(null)
        const content = marker.getContent?.()
        content?.remove?.()
      } catch (e) {
        console.warn('[Map] 移除设备 Marker 失败', e)
      }
    })
    waterDvMarkers.length = 0
    layerShowState = { waterDv: null, fismart: null }
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
      const dvStub = {
        type: marker.__isFertilizer ? FISMART_DEVICE_TYPE : 50,
        isOnline: marker.__isOnline
      }
      applyDeviceMarkerIconState(dom, dvStub, false)
      const card = dom.querySelector('.device-info-popup')
      if (card) card.style.display = 'none'
    })
  }

  /**
   * 对齐移动端：出水桩 waterDv、施肥机 fismart 分层；zoom ≥ 13
   */
  const refreshWaterDvLayerVisible = (
    map,
    layerOptions = [],
    force = false
  ) => {
    if (!map) return
    const currentZoom = map.getZoom()
    const zoomOk = currentZoom >= WATER_DV_MIN_SHOW_ZOOM
    const dvBaseShow = getLayerVisible(layerOptions, 'waterDv', true)
    const fertilizerBaseShow = getLayerVisible(layerOptions, 'fismart', true)
    const dvShow = zoomOk && dvBaseShow
    const fertilizerShow = zoomOk && fertilizerBaseShow

    if (
      !force &&
      dvShow === layerShowState.waterDv &&
      fertilizerShow === layerShowState.fismart
    ) {
      return
    }
    layerShowState.waterDv = dvShow
    layerShowState.fismart = fertilizerShow

    waterDvMarkers.forEach((marker) => {
      const show = marker.__isFertilizer ? fertilizerShow : dvShow
      show ? marker.setMap(map) : marker.setMap(null)
    })
  }

  /** 对齐移动端 updateSingleWaterDvMarkerDom */
  const updateSingleWaterDvMarkerDom = (marker, dv) => {
    const dom = marker?.getContent?.()
    if (!dom || !dv) return

    const isFertilizer = isFertilizerDevice(dv)
    marker.__isFertilizer = isFertilizer
    marker.__isOnline = !!dv.isOnline

    const arrowImg = dom.querySelector('.device-arrow-image')
    if (arrowImg) {
      arrowImg.src = isFertilizer
        ? getFertilizerArrowSrc(dv)
        : getOutletArrowSrc(dv)
    }

    const rotateWrap = dom.querySelector('.device-rotate-container')
    if (rotateWrap) {
      if (isFertilizer) {
        rotateWrap.style.transform = getRotateTransform(0)
      } else {
        const calibratedAngle = normalizeAngle(
          Number(dv.orientationAngle) - 45
        )
        rotateWrap.style.transform = getRotateTransform(calibratedAngle)
        rebuildPortDots(rotateWrap, getPorts(dv))
      }
    }

    const infoCard = dom.querySelector('.device-info-popup')
    if (infoCard) {
      infoCard.innerHTML = buildInfoCardHtml(dv)
      if (String(dv.id) === String(activeWaterDvId)) {
        infoCard.style.display = 'block'
        dom.style.transform = 'scale(1.1)'
        marker.setzIndex(999999)
        dom.style.zIndex = '999999'
        applyDeviceMarkerIconState(dom, dv, true)
      }
    }

    const nameLabel = dom.querySelector('.device-info-card')
    if (nameLabel && dv.name) {
      nameLabel.textContent = dv.name
    }
  }

  /**
   * 对齐移动端 refreshWaterDvMarkerStatus
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

  /**
   * 对齐移动端 createWaterDvMarker：统一 DOM（底图 + 中心图标 + 可选端口圆点）
   */
  const createWaterDvMarker = (map, dv, index) => {
    if (!map || !dv) return null
    const { longitude, latitude } = dv
    if (longitude == null || latitude == null) return null

    const MARKER_SIZE = DEFAULT_MARKER_SIZE
    const ARROW_SIZE = MARKER_SIZE * 0.6
    const LABEL_FONT_SIZE = 14
    const ICON_LABEL_GAP = 2
    const isFertilizer = isFertilizerDevice(dv)
    const isOnline = !!dv.isOnline
    const ports = getPorts(dv)
    const calibratedAngle = isFertilizer
      ? 0
      : normalizeAngle(Number(dv.orientationAngle) - 45)

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

    const bgImg = document.createElement('img')
    bgImg.className = 'device-marker-image'
    bgImg.src = DEVICE_MARKER_IMAGES.bgNormal
    bgImg.alt = ''
    bgImg.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:50%',
      'transform:translate(-50%,-50%)',
      `width:${px2rem(MARKER_SIZE)}`,
      `height:${px2rem(MARKER_SIZE)}`,
      'object-fit:contain',
      'pointer-events:none',
      'z-index:1'
    ].join(';')
    iconContainer.appendChild(bgImg)

    const rotateWrap = document.createElement('div')
    rotateWrap.className = 'device-rotate-container'
    rotateWrap.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:50%',
      `transform:${getRotateTransform(calibratedAngle)}`,
      `width:${px2rem(ARROW_SIZE)}`,
      `height:${px2rem(ARROW_SIZE)}`,
      'z-index:10',
      'pointer-events:none',
      'overflow:visible'
    ].join(';')

    const arrowImg = document.createElement('img')
    arrowImg.className = 'device-arrow-image'
    arrowImg.src = isFertilizer
      ? getFertilizerArrowSrc(dv)
      : getOutletArrowSrc(dv)
    arrowImg.alt = ''
    arrowImg.style.cssText = [
      'width:100%',
      'height:100%',
      'object-fit:contain',
      'display:block',
      'pointer-events:none'
    ].join(';')
    rotateWrap.appendChild(arrowImg)

    // 施肥机无出水口端口圆点
    if (!isFertilizer) {
      rebuildPortDots(rotateWrap, ports)
    }
    iconContainer.appendChild(rotateWrap)

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
    nameLabel.textContent = dv.name || (isFertilizer ? '施肥机' : '未知设备')
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
    marker.__isFertilizer = isFertilizer
    marker.__isOnline = isOnline

    iconContainer.addEventListener('click', (e) => {
      e.stopImmediatePropagation()
      e.preventDefault()

      resetAllWaterDvMarkers()
      activeWaterDvId = dv.id
      marker.setzIndex(999999)
      dom.style.zIndex = '999999'
      dom.style.transform = 'scale(1.1)'
      applyDeviceMarkerIconState(dom, dv, true)
      infoCard.style.display = 'block'

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
