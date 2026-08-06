<template>
  <div class="edit-plot-page">
    <div class="edit-plot-top">
      <h2 class="edit-plot-top__title">{{ pageTitle }}</h2>
      <button type="button" class="edit-plot-back" @click="onBack">
        <span class="edit-plot-back__arrow">←</span>
        返回
      </button>
    </div>

    <div class="edit-plot-map-wrap">
      <div v-if="!mapReady" class="edit-plot-loading">地图加载中...</div>
      <div id="edit-plot-map" class="edit-plot-map"></div>

      <!-- 右上：删除 / 撤销 / 恢复 -->
      <div class="edit-plot-tools">
        <button
          type="button"
          class="edit-plot-tools__btn"
          :class="hasDrawPoint ? 'is-danger' : 'is-disabled'"
          @click="clickTool(1)"
        >
          <i class="iconfont icon-land_ic_dele"></i>
          <span>删除</span>
        </button>
        <button
          type="button"
          class="edit-plot-tools__btn"
          :class="hasUndo ? 'is-active' : 'is-disabled'"
          @click="clickTool(2)"
        >
          <i class="iconfont icon-map_ic_cancel"></i>
          <span>撤销</span>
        </button>
        <button
          type="button"
          class="edit-plot-tools__btn"
          :class="hasRedo ? 'is-active' : 'is-disabled'"
          @click="clickTool(3)"
        >
          <i class="iconfont icon-map_ic_restore"></i>
          <span>恢复</span>
        </button>
      </div>

      <!-- 缩放 / 定位 -->
      <div class="edit-plot-zoom">
        <button type="button" class="edit-plot-zoom__btn" title="放大" @click="handleZoomIn">
          +
        </button>
        <button type="button" class="edit-plot-zoom__btn" title="缩小" @click="handleZoomOut">
          −
        </button>
        <button
          type="button"
          class="edit-plot-zoom__btn edit-plot-zoom__locate"
          title="回到当前位置"
          @click="getLocation"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle cx="12" cy="12" r="3" fill="#2f6bff" />
            <circle
              cx="12"
              cy="12"
              r="6.5"
              fill="none"
              stroke="#2f6bff"
              stroke-width="2"
            />
            <path
              d="M12 2v3.2M12 18.8V22M2 12h3.2M18.8 12H22"
              fill="none"
              stroke="#2f6bff"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <!-- 底部操作 -->
      <div class="edit-plot-actions">
        <button
          v-if="!drawing && !isClosed && pointCount === 0"
          type="button"
          class="edit-plot-actions__btn is-primary"
          @click="startDrawLand"
        >
          {{ startText }}
        </button>
        <button
          v-else-if="drawing || isClosed"
          type="button"
          class="edit-plot-actions__btn is-plain"
          @click="cancelDraw"
        >
          退出圈地
        </button>
        <button
          v-if="isClosed"
          type="button"
          class="edit-plot-actions__btn is-plain"
          @click="colorPickerVisible = true"
        >
          地块颜色
        </button>
        <button
          v-if="drawing && pointCount >= 3"
          type="button"
          class="edit-plot-actions__btn is-primary"
          @click="closePolygon"
        >
          闭合地块
        </button>
        <button
          v-if="isClosed"
          type="button"
          class="edit-plot-actions__btn is-primary"
          @click="savePolygon"
        >
          保存
        </button>
      </div>
    </div>

    <!-- 颜色选择 -->
    <div
      v-if="colorPickerVisible"
      class="edit-plot-color-mask"
      @click.self="colorPickerVisible = false"
    >
      <div class="edit-plot-color-dialog" @click.stop>
        <div class="edit-plot-color-dialog__header">
          <h3>选择颜色</h3>
          <button type="button" class="edit-plot-color-dialog__ok" @click="confirmColor">
            确认
          </button>
        </div>
        <div class="edit-plot-color-dialog__grid">
          <button
            v-for="(c, idx) in colorList"
            :key="idx"
            type="button"
            class="edit-plot-color-dialog__swatch"
            :class="{ 'is-chose': tempColor === c }"
            :style="{ backgroundColor: c }"
            @click="tempColor = c"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useFarmStore } from '@/store/farm'
import { getFarmInfo, updateLand } from '@/api/map'
import { prepareFarmMapResources } from '@/utils/farmMapData'
import { createFarmMarkerDrawer } from '@/utils/farmMapMarker'
import { createLandPolygonDrawer } from '@/utils/farmMapLand'
import { createWaterDvMarkerDrawer } from '@/utils/farmMapWaterDv'

const route = useRoute()
const router = useRouter()
const farmStore = useFarmStore()

const pageType = computed(() => route.query.type || 'add')
const landId = computed(() => route.query.landId || '')
/** 农场设置编辑地块进入圈地页：对齐移动端 edit → dataChange 回写，不在此 PUT */
const fromFarmEditLand = computed(
  () => route.query.from === 'farm-edit-land'
)
const pageTitle = computed(() => {
  if (pageType.value === 'edit') return '编辑地块'
  if (pageType.value === 'addGroup') return '新建轮灌组'
  if (pageType.value === 'editGroup') return '编辑轮灌组'
  return '新建地块'
})
const startText = computed(() => {
  if (pageType.value === 'addGroup' || pageType.value === 'editGroup') {
    return '开始圈定轮灌组范围'
  }
  return '开始圈定地块范围'
})
const maxLandCount = 1

const mapReady = ref(false)
const drawing = ref(false)
const isClosed = ref(false)
const pointCount = ref(0)
const hasUndo = ref(false)
const hasRedo = ref(false)
const hasDrawPoint = computed(
  () =>
    pointCount.value > 0 ||
    ((pageType.value === 'edit' || pageType.value === 'editGroup') &&
      isClosed.value)
)
const selectColor = ref('#2196F3')
const colorPickerVisible = ref(false)
const tempColor = ref('#2196F3')

const colorList = [
  '#000000',
  '#333333',
  '#666666',
  '#1A237E',
  '#2196F3',
  '#00BCD4',
  '#009688',
  '#4CAF50',
  '#8BC34A',
  '#CDDC39',
  '#FFEB3B',
  '#FFC107',
  '#FF9800',
  '#FF5722',
  '#F44336',
  '#E91E63',
  '#9C27B0',
  '#673AB7',
  '#795548',
  '#607D8B',
  '#D32F2F',
  '#1B5E20',
  '#0D47A1',
  '#FFD700'
]

let map = null
let geocoder = null
let nowMark = null
let pointList = []
let markerList = []
/** 边线中点 Marker（拖拽插入新顶点，对齐移动端 midPointMarkerList） */
let midPointMarkerList = []
let polyline = null
let currentPolygon = null
let areaCenterText = null
let historyStack = [[]]
let redoStack = []
let canDraw = false
let allWaterDvList = []
let defaultLandList = []
let farmInfoCache = null
let toolClickLock = false
/** 编辑模式：当前地块完整元数据（对齐移动端 vuex_land / add-edit-land） */
let editingLandRecord = null

const farmMarkerDrawer = createFarmMarkerDrawer()
const landPolygonDrawer = createLandPolygonDrawer()
const waterDvMarkerDrawer = createWaterDvMarkerDrawer()

const LOCATION_NOW_ICON =
  'https://cdzp-oss.farm-net.cn/app/uniapp/water_helper/location_now.png'

watch(selectColor, (val) => {
  if (isClosed.value && currentPolygon) {
    currentPolygon.setOptions({ fillColor: val })
  }
})

const onBack = () => {
  if (window.history.length > 1) router.back()
  else router.replace('/map')
}

const handleZoomIn = () => map?.zoomIn?.()
const handleZoomOut = () => map?.zoomOut?.()

const clonePoints = (list) =>
  list.map((p) => ({ lng: p.lng, lat: p.lat }))

const toLngLat = (p) => new window.AMap.LngLat(p.lng, p.lat)

const updateStackState = () => {
  hasUndo.value = historyStack.length > 1
  hasRedo.value = redoStack.length > 0
}

const pushHistory = () => {
  historyStack.push(clonePoints(pointList))
  redoStack = []
  updateStackState()
}

const clearMarkers = () => {
  markerList.forEach((m) => {
    try {
      m.setMap(null)
    } catch (e) {
      /* ignore */
    }
  })
  markerList = []
}

const clearMidPointMarkers = () => {
  midPointMarkerList.forEach((m) => {
    try {
      m.setMap(null)
    } catch (e) {
      /* ignore */
    }
  })
  midPointMarkerList = []
}

const clearPolyline = () => {
  if (polyline) {
    polyline.setMap(null)
    polyline = null
  }
}

const clearAreaText = () => {
  if (areaCenterText) {
    areaCenterText.setMap(null)
    areaCenterText = null
  }
}

const clearCurrentEdit = () => {
  clearMarkers()
  clearMidPointMarkers()
  clearPolyline()
  clearAreaText()
  if (currentPolygon) {
    currentPolygon.setMap(null)
    currentPolygon = null
  }
  pointList = []
  pointCount.value = 0
  canDraw = false
}

const refreshPolyline = () => {
  if (!map) return
  if (pointList.length < 2) {
    clearPolyline()
    return
  }
  const path = pointList.map(toLngLat)
  if (polyline) {
    polyline.setPath(path)
    return
  }
  polyline = new window.AMap.Polyline({
    path,
    strokeColor: '#007aff',
    strokeWeight: 3,
    zIndex: 20,
    map
  })
}

/** 圈地打点：轻量 Marker（对齐移动端），避免每次全量重建 */
const createDrawingVertexMarker = (index, lng, lat) => {
  const isStart = index === 0
  return new window.AMap.Marker({
    position: [lng, lat],
    anchor: 'center',
    zIndex: 30,
    // 打点过程中不拦截地图点击，避免连续加点被顶点挡住
    clickable: false,
    content: isStart
      ? '<div style="width:16px;height:16px;border-radius:50%;background:#00c853;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.35);pointer-events:none;"></div>'
      : '<div style="width:14px;height:14px;border-radius:50%;background:#007aff;border:2px solid #fff;pointer-events:none;"></div>',
    map
  })
}

const appendPlotPoint = (lng, lat) => {
  const index = pointList.length
  pointList.push({ lng, lat })
  markerList.push(createDrawingVertexMarker(index, lng, lat))
  pointCount.value = pointList.length
  refreshPolyline()
  pushHistory()
}

/**
 * 圈地时保留出水桩/农场标记显示，但关闭命中，避免大面积 DOM Marker 吞掉 map.click
 *（出水桩容器约 120px 宽且 stopImmediatePropagation，会导致几乎打不上点）
 */
const setBackgroundMarkersClickThrough = (passThrough) => {
  const apply = (markers) => {
    ;(markers || []).forEach((marker) => {
      try {
        marker.setClickable?.(!passThrough)
      } catch (e) {
        /* ignore */
      }
      const dom = marker.getContent?.()
      if (dom?.style) {
        dom.style.pointerEvents = passThrough ? 'none' : 'auto'
        dom.style.cursor = passThrough ? 'default' : 'pointer'
      }
    })
  }
  apply(waterDvMarkerDrawer.waterDvMarkers)
  apply(farmMarkerDrawer.farmMarkers)
}

/** 统一打点逻辑（供 map.click / 容器捕获点击复用） */
const handleDrawAtLngLat = (lng, lat) => {
  if (!canDraw || !drawing.value || isClosed.value) return
  if (lng == null || lat == null) return

  if (pointList.length >= 3) {
    const first = pointList[0]
    const dx = lng - first.lng
    const dy = lat - first.lat
    // 近似闭合阈值（约 8 米级，避免每次调 GeometryUtil）
    if (dx * dx + dy * dy < 5e-9) {
      closePolygon()
      return
    }
  }

  appendPlotPoint(lng, lat)
}

let drawingCaptureBound = false

/** 捕获阶段监听：在出水桩/农场 Marker 处理前拿到点击，保证圈地可打点 */
const onDrawingContainerClick = (e) => {
  if (!canDraw || !drawing.value || isClosed.value || !map) return
  if (e.button != null && e.button !== 0) return

  const container = map.getContainer?.()
  if (!container) return

  const rect = container.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) return

  const lnglat = map.containerToLngLat(new window.AMap.Pixel(x, y))
  if (!lnglat) return

  // 阻止冒泡到出水桩 DOM 的 click（其内部 stopImmediatePropagation 会吞掉地图事件）
  e.preventDefault()
  e.stopPropagation()

  handleDrawAtLngLat(lnglat.lng, lnglat.lat)
}

const bindDrawingCapture = () => {
  if (drawingCaptureBound || !map) return
  const container = map.getContainer?.()
  if (!container) return
  container.addEventListener('click', onDrawingContainerClick, true)
  drawingCaptureBound = true
}

const unbindDrawingCapture = () => {
  if (!drawingCaptureBound || !map) return
  const container = map.getContainer?.()
  if (container) {
    container.removeEventListener('click', onDrawingContainerClick, true)
  }
  drawingCaptureBound = false
}

const getPolygonCenter = (path) => {
  let lng = 0
  let lat = 0
  path.forEach((p) => {
    lng += p.lng
    lat += p.lat
  })
  const n = path.length || 1
  return new window.AMap.LngLat(lng / n, lat / n)
}

const updateClosedAreaText = () => {
  if (!map) return
  const pathSource =
    currentPolygon?.getPath?.() ||
    (pointList.length >= 3 ? pointList.map(toLngLat) : null)
  if (!pathSource?.length) return
  const areaSqm = window.AMap.GeometryUtil.ringArea(pathSource)
  const areaMu = (areaSqm * 0.0015).toFixed(2)
  const center = getPolygonCenter(pathSource)
  clearAreaText()
  areaCenterText = new window.AMap.Text({
    text: `${areaMu} 亩`,
    position: center,
    anchor: 'center',
    zooms: [3, 26],
    zIndex: 30,
    style: {
      backgroundColor: 'rgba(0,0,0,0.65)',
      borderRadius: '4px',
      padding: '2px 6px',
      fontSize: '12px',
      color: '#fff',
      fontWeight: 'bold'
    },
    map
  })
}

/** 闭合编辑态：同步多边形路径与面积标注 */
const syncEditGeometry = () => {
  if (!map || pointList.length < 3) return
  if (currentPolygon) {
    currentPolygon.setPath(pointList.map(toLngLat))
  }
  updateClosedAreaText()
  refreshClosedEditPolyline()
}

/** 闭合编辑态边线（含首尾相连） */
const refreshClosedEditPolyline = () => {
  clearPolyline()
  if (!map || pointList.length < 2) return
  polyline = new window.AMap.Polyline({
    path: pointList.map(toLngLat),
    strokeColor: '#007aff',
    strokeWeight: 3,
    zIndex: 21,
    map
  })
}

const bindVertexDrag = (marker, index) => {
  marker.on('dragging', (e) => {
    clearMidPointMarkers()
    const pos = e.lnglat
    pointList[index] = { lng: pos.lng, lat: pos.lat }
    syncEditGeometry()
  })
  marker.on('dragend', () => {
    pushHistory()
    renderEditableVertices(true)
  })
}

const createStartVertexMarker = () => {
  const marker = new window.AMap.Marker({
    position: toLngLat(pointList[0]),
    anchor: 'center',
    zIndex: 26,
    draggable: true,
    content:
      '<div style="width:16px;height:16px;border-radius:50%;background:#00c853;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.4);"></div>',
    map
  })
  bindVertexDrag(marker, 0)
  return marker
}

const createRegularVertexMarker = (index) => {
  const vertexHitSize = 32
  const vertexDotSize = 14
  const vertexContent = document.createElement('div')
  vertexContent.style.cssText = `
    width: ${vertexHitSize}px;
    height: ${vertexHitSize}px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
  `
  const vertexInner = document.createElement('div')
  vertexInner.style.cssText = `
    width: ${vertexDotSize}px;
    height: ${vertexDotSize}px;
    border-radius: 50%;
    background: #007aff;
    border: 2px solid #fff;
    box-shadow: 0 0 2px rgba(0,0,0,.25);
  `
  vertexContent.appendChild(vertexInner)

  const marker = new window.AMap.Marker({
    position: toLngLat(pointList[index]),
    anchor: 'center',
    zIndex: 25,
    draggable: true,
    content: vertexContent,
    map
  })
  bindVertexDrag(marker, index)
  return marker
}

/** 边线中点：拖拽插入新顶点（对齐移动端 drawSegmentDistance midMarker） */
const renderMidPointMarkers = () => {
  clearMidPointMarkers()
  if (!isClosed.value || pointList.length < 3 || !map) return

  for (let i = 0; i < pointList.length; i += 1) {
    const p1 = pointList[i]
    const p2 = pointList[(i + 1) % pointList.length]
    const midLng = (p1.lng + p2.lng) / 2
    const midLat = (p1.lat + p2.lat) / 2
    const insertIndex = i

    const hitAreaSize = 30
    const dotSize = 10
    const midContent = document.createElement('div')
    midContent.style.cssText = `
      width: ${hitAreaSize}px;
      height: ${hitAreaSize}px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
    `
    const innerDot = document.createElement('div')
    innerDot.style.cssText = `
      width: ${dotSize}px;
      height: ${dotSize}px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 0 2px rgba(0,0,0,0.3);
    `
    midContent.appendChild(innerDot)

    const midMarker = new window.AMap.Marker({
      position: [midLng, midLat],
      anchor: 'center',
      draggable: true,
      content: midContent,
      zIndex: 24,
      map
    })

    midMarker.on('dragging', (e) => {
      const pos = e.lnglat
      const preview = clonePoints(pointList)
      preview.splice(insertIndex + 1, 0, { lng: pos.lng, lat: pos.lat })
      if (currentPolygon) {
        currentPolygon.setPath(preview.map(toLngLat))
      }
      clearPolyline()
      if (preview.length >= 2) {
        polyline = new window.AMap.Polyline({
          path: preview.map(toLngLat),
          strokeColor: '#007aff',
          strokeWeight: 3,
          zIndex: 21,
          map
        })
      }
    })

    midMarker.on('dragend', (e) => {
      const pos = e.lnglat
      pointList.splice(insertIndex + 1, 0, { lng: pos.lng, lat: pos.lat })
      pointCount.value = pointList.length
      pushHistory()
      renderEditableVertices(true)
    })

    midPointMarkerList.push(midMarker)
  }
}

/**
 * 渲染可拖拽顶点编辑态（对齐移动端 switchLandToEditMode + renderPoints）
 * @param {boolean} preservePolygon 保留当前填充多边形，仅重建控制点
 */
const renderEditableVertices = (preservePolygon = false) => {
  if (!map) return

  clearMidPointMarkers()
  clearMarkers()

  if (!preservePolygon) {
    clearPolyline()
    if (currentPolygon) {
      currentPolygon.setMap(null)
      currentPolygon = null
    }
    clearAreaText()
  }

  if (!pointList.length) {
    pointCount.value = 0
    updateStackState()
    return
  }

  pointList.forEach((_, idx) => {
    const marker =
      idx === 0 ? createStartVertexMarker() : createRegularVertexMarker(idx)
    markerList.push(marker)
  })

  pointCount.value = pointList.length

  if (preservePolygon && currentPolygon) {
    syncEditGeometry()
  } else if (pointList.length >= 3) {
    currentPolygon = new window.AMap.Polygon({
      path: pointList.map(toLngLat),
      strokeColor: '#007aff',
      strokeWeight: 3,
      fillColor: selectColor.value,
      fillOpacity: 0.35,
      zIndex: 22,
      map
    })
    updateClosedAreaText()
    refreshClosedEditPolyline()
  }

  renderMidPointMarkers()
  updateStackState()
}

const rebuildMarkersFromPoints = () => {
  clearMarkers()
  pointList.forEach((p, idx) => {
    markerList.push(createDrawingVertexMarker(idx, p.lng, p.lat))
  })
  pointCount.value = pointList.length
  refreshPolyline()
}

const startDrawLand = () => {
  if (pointCount.value >= maxLandCount && isClosed.value) {
    ElMessage.warning('当前仅支持编辑一个地块，请先删除后重画')
    return
  }
  clearCurrentEdit()
  drawing.value = true
  isClosed.value = false
  canDraw = true
  historyStack = [[]]
  redoStack = []
  updateStackState()
  setBackgroundMarkersClickThrough(true)
  bindDrawingCapture()
}

const cancelDraw = () => {
  clearCurrentEdit()
  drawing.value = false
  isClosed.value = false
  hasUndo.value = false
  hasRedo.value = false
  historyStack = [[]]
  redoStack = []
  unbindDrawingCapture()
  setBackgroundMarkersClickThrough(false)
}

const closePolygon = () => {
  if (pointList.length < 3 || !map) {
    ElMessage.warning('至少需要 3 个点才能闭合')
    return
  }
  clearPolyline()
  if (currentPolygon) currentPolygon.setMap(null)
  currentPolygon = new window.AMap.Polygon({
    path: pointList.map(toLngLat),
    strokeColor: '#007aff',
    strokeWeight: 3,
    fillColor: selectColor.value,
    fillOpacity: 0.35,
    zIndex: 18,
    map
  })
  canDraw = false
  drawing.value = false
  isClosed.value = true
  historyStack = [clonePoints(pointList)]
  redoStack = []
  unbindDrawingCapture()
  setBackgroundMarkersClickThrough(false)
  renderEditableVertices(true)
  ElMessage.success('地块已闭合')
}

const matchDevicesToLand = (land, devices) => {
  const deviceIds = []
  if (!land?.landPoint?.length || land.landPoint.length < 3) {
    return { ...land, deviceIds }
  }
  const ring = land.landPoint.map((p) => [p.lng, p.lat])
  devices.forEach((device) => {
    if (device.longitude == null || device.latitude == null) return
    const inside = window.AMap.GeometryUtil.isPointInRing(
      [device.longitude, device.latitude],
      ring
    )
    if (inside) deviceIds.push(device.id)
  })
  return { ...land, deviceIds }
}

const formatCurrentLand = () => {
  const pathPoints =
    pointList.length >= 3
      ? pointList
      : currentPolygon
        ?.getPath()
        ?.map((p) => ({ lng: p.lng, lat: p.lat })) || []
  if (pathPoints.length < 3) return null

  const path = pathPoints.map(toLngLat)
  const areaSqm = window.AMap.GeometryUtil.ringArea(path)
  const landPoint = pathPoints.map((p) => ({ lng: p.lng, lat: p.lat }))
  return {
    landName: '',
    landPoint,
    fillColor: selectColor.value,
    areaSqm: areaSqm.toFixed(2),
    areaMu: (areaSqm * 0.0015).toFixed(2),
    address: '',
    lng: landPoint[0]?.lng ?? '',
    lat: landPoint[0]?.lat ?? '',
    deviceIds: []
  }
}

const resolveGeocodeAddress = (lng, lat) =>
  new Promise((resolve) => {
    if (!geocoder || lng == null || lat == null) {
      resolve('')
      return
    }
    geocoder.getAddress([lng, lat], (status, result) => {
      if (status === 'complete' && result?.regeocode) {
        resolve(result.regeocode.formattedAddress || '')
      } else {
        resolve('')
      }
    })
  })

const resetDrawUiState = () => {
  drawing.value = false
  isClosed.value = false
  pointCount.value = 0
  canDraw = false
  clearCurrentEdit()
  historyStack = [[]]
  redoStack = []
  updateStackState()
}

/** 编辑模式保存：PUT /api/land-plot（对齐移动端 map-edit-plot type=edit → addEditLand dataChange） */
const submitEditLand = async (land, address) => {
  const meta = editingLandRecord || farmStore.s_land
  if (!meta?.id) {
    ElMessage.warning('地块信息缺失，请返回重试')
    return
  }
  const farmId = farmStore.selectFarm?.id
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    return
  }

  // 农场设置流程：仅回写 s_land，由 EditLand 页统一保存（对齐移动端 dataChange）
  if (fromFarmEditLand.value) {
    const areaJson = JSON.stringify({
      landPoint: land.landPoint,
      fillColor: land.fillColor
    })
    farmStore.setLand({
      ...meta,
      name: meta.name || meta.landName || '',
      area: land.areaMu,
      areaMu: land.areaMu,
      areaJson,
      address: address || meta.address || '',
      longitude: land.lng,
      latitude: land.lat,
      lng: land.lng,
      lat: land.lat,
      landPoint: land.landPoint,
      fillColor: land.fillColor,
      deviceIds: land.deviceIds?.length
        ? land.deviceIds
        : meta.deviceIds || []
    })
    editingLandRecord = null
    resetDrawUiState()
    const returnFrom = route.query.returnFrom
    router.replace({
      path: '/farm/edit-land',
      query: {
        type: 'edit',
        ...(returnFrom ? { from: String(returnFrom) } : {})
      }
    })
    return
  }

  try {
    const res = await updateLand({
      id: meta.id,
      farmId,
      name: meta.name || meta.landName || '',
      area: land.areaMu,
      areaJson: JSON.stringify({
        landPoint: land.landPoint,
        fillColor: land.fillColor
      }),
      address: address || meta.address || '',
      longitude: land.lng,
      latitude: land.lat,
      coordinateType: meta.coordinateType ?? 1,
      deviceIds: land.deviceIds || []
    })
    if (res?.code === 200) {
      ElMessage.success('操作成功')
      farmStore.setLand(null)
      editingLandRecord = null
      resetDrawUiState()
      router.replace('/map')
    }
  } catch (e) {
    console.error('[MapEditPlot] 更新地块失败', e)
  }
}

const savePolygon = async () => {
  if (!isClosed.value || !currentPolygon) {
    ElMessage.warning('请先闭合地块')
    return
  }
  let land = formatCurrentLand()
  if (!land) return

  land = matchDevicesToLand(land, allWaterDvList)
  const address = await resolveGeocodeAddress(land.lng, land.lat)

  if (pageType.value === 'edit') {
    await submitEditLand(land, address)
    return
  }

  if (pageType.value === 'addGroup') {
    const areaJson = JSON.stringify({
      landPoint: land.landPoint,
      fillColor: land.fillColor
    })
    farmStore.patchAddGroupArea(land.areaMu, areaJson)
    resetDrawUiState()
    router.push({
      path: '/irrigation-group/edit',
      query: { type: 'add', from: 'map' }
    })
    return
  }

  if (pageType.value === 'editGroup') {
    farmStore.setPendingGroupChange({
      topic: 'changeLand',
      data: land
    })
    resetDrawUiState()
    if (window.history.length > 1) router.back()
    else {
      router.replace({
        path: '/irrigation-group/edit',
        query: { type: 'edit' }
      })
    }
    return
  }

  land.address = address
  farmStore.setLand(land)
  resetDrawUiState()
  router.push({ path: '/map/add-edit-land', query: { type: 'add' } })
}

const clickTool = (index) => {
  if (toolClickLock) return
  if (index === 2 && !hasUndo.value) return
  if (index === 3 && !hasRedo.value) return
  toolClickLock = true
  setTimeout(() => {
    toolClickLock = false
  }, 200)

  if (index === 1) {
    if (!hasDrawPoint.value && !isClosed.value) {
      ElMessage.info('暂无编辑点位可清空')
      return
    }
    clearCurrentEdit()
    drawing.value = false
    isClosed.value = false
    historyStack = [[]]
    redoStack = []
    updateStackState()
    ElMessage.success('已清空所有圈地点位')
    return
  }

  if (index === 2) {
    if (historyStack.length <= 1) return
    const current = historyStack.pop()
    redoStack.push(current)
    const prev = historyStack[historyStack.length - 1] || []
    const wasClosed = isClosed.value
    pointList = clonePoints(prev)
    if (wasClosed && pointList.length >= 3) {
      isClosed.value = true
      drawing.value = false
      canDraw = false
      if (!currentPolygon) {
        currentPolygon = new window.AMap.Polygon({
          path: pointList.map(toLngLat),
          strokeColor: '#007aff',
          strokeWeight: 3,
          fillColor: selectColor.value,
          fillOpacity: 0.35,
          zIndex: 22,
          map
        })
      }
      renderEditableVertices(true)
    } else {
      if (currentPolygon) {
        currentPolygon.setMap(null)
        currentPolygon = null
      }
      clearAreaText()
      isClosed.value = false
      drawing.value = true
      canDraw = true
      rebuildMarkersFromPoints()
    }
    updateStackState()
    return
  }

  if (index === 3) {
    if (!redoStack.length) return
    const next = redoStack.pop()
    historyStack.push(clonePoints(next))
    const wasClosed = isClosed.value
    pointList = clonePoints(next)
    if (wasClosed && pointList.length >= 3) {
      isClosed.value = true
      drawing.value = false
      canDraw = false
      if (!currentPolygon) {
        currentPolygon = new window.AMap.Polygon({
          path: pointList.map(toLngLat),
          strokeColor: '#007aff',
          strokeWeight: 3,
          fillColor: selectColor.value,
          fillOpacity: 0.35,
          zIndex: 22,
          map
        })
      }
      renderEditableVertices(true)
    } else {
      isClosed.value = false
      drawing.value = true
      canDraw = true
      if (currentPolygon) {
        currentPolygon.setMap(null)
        currentPolygon = null
      }
      clearAreaText()
      rebuildMarkersFromPoints()
    }
    updateStackState()
  }
}

const confirmColor = () => {
  if (tempColor.value) {
    selectColor.value = tempColor.value
  }
  colorPickerVisible.value = false
}

const onMapClick = (e) => {
  // 圈地模式改由容器捕获点击处理，避免与出水桩 DOM 抢事件导致双重点/丢点
  if (drawingCaptureBound) return
  if (!canDraw || !drawing.value || isClosed.value) return
  const lnglat = e.lnglat
  if (!lnglat) return
  handleDrawAtLngLat(lnglat.lng, lnglat.lat)
}

const getLocation = () => {
  if (!map || typeof window.AMap === 'undefined') return
  window.AMap.plugin('AMap.Geolocation', () => {
    const geo = new window.AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 10000,
      noIpLocate: true,
      convert: true,
      showButton: false,
      showMarker: false,
      showCircle: false
    })
    geo.getCurrentPosition((status, result) => {
      if (status === 'complete' && result?.position) {
        const lng = result.position.lng ?? result.position.getLng?.()
        const lat = result.position.lat ?? result.position.getLat?.()
        if (lng == null || lat == null) return
        if (nowMark) {
          try {
            map.remove(nowMark)
          } catch (e) {
            /* ignore */
          }
        }
        nowMark = new window.AMap.Marker({
          map,
          position: [lng, lat],
          offset: new window.AMap.Pixel(-18, -36),
          content: `<img src="${LOCATION_NOW_ICON}" style="width:36px;height:36px;display:block;" />`
        })
        map.setZoomAndCenter(17, [lng, lat])
      } else {
        ElMessage.warning('定位失败')
      }
    })
  })
}

const fitSceneView = () => {
  if (!map) return
  const farm = farmInfoCache || farmStore.selectFarm
  const lng = Number(farm?.longitude)
  const lat = Number(farm?.latitude)
  if (Number.isFinite(lng) && Number.isFinite(lat)) {
    map.setZoomAndCenter(16, [lng, lat])
  }
}

const fitPolygonView = (points) => {
  if (!map || !Array.isArray(points) || points.length < 3) return
  try {
    const lngs = points.map((p) => p.lng)
    const lats = points.map((p) => p.lat)
    const sw = new window.AMap.LngLat(Math.min(...lngs), Math.min(...lats))
    const ne = new window.AMap.LngLat(Math.max(...lngs), Math.max(...lats))
    map.setBounds(new window.AMap.Bounds(sw, ne), false, [80, 80, 120, 80])
  } catch (e) {
    console.warn('[MapEditPlot] 适配地块视野失败', e)
    fitSceneView()
  }
}

/** 将已有地块载入为可拖拽编辑态（对齐移动端 selectLandByIndex → switchLandToEditMode） */
const loadLandIntoEditor = (landItem) => {
  if (!map || !landItem?.landPoint?.length) return
  clearCurrentEdit()
  pointList = clonePoints(landItem.landPoint)
  selectColor.value = landItem.fillColor || '#2196F3'
  tempColor.value = selectColor.value

  currentPolygon = new window.AMap.Polygon({
    path: pointList.map(toLngLat),
    strokeColor: '#007aff',
    strokeWeight: 3,
    fillColor: selectColor.value,
    fillOpacity: 0.35,
    zIndex: 22,
    map
  })

  isClosed.value = true
  drawing.value = false
  canDraw = false
  historyStack = [clonePoints(pointList)]
  redoStack = []
  renderEditableVertices(true)
  fitPolygonView(pointList)
}

const loadFarmAndDraw = async () => {
  const farmId = farmStore.selectFarm?.id
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    return
  }
  try {
    const res = await getFarmInfo(farmId)
    if (res?.code !== 200 || !res.data) return
    farmInfoCache = res.data
    const prepared = prepareFarmMapResources(res.data)
    allWaterDvList = prepared.waterDvList || []

    const allLands = prepared.landList || []
    const layerOptions = [
      { value: 'farm', isChose: true },
      { value: 'land', isChose: true },
      { value: 'waterDv', isChose: true }
    ]

    // type=add / addGroup：已有地块全部作为不可编辑背景层
    if (
      pageType.value === 'add' ||
      pageType.value === 'addGroup' ||
      pageType.value === 'editGroup'
    ) {
      defaultLandList = allLands
    }

    // type=addGroup / editGroup：仅展示关联出水桩
    if (pageType.value === 'addGroup' || pageType.value === 'editGroup') {
      const groupDeviceList = farmStore.s_group_deviceList || []
      let showDeviceList = []

      if (pageType.value === 'addGroup') {
        groupDeviceList.forEach((item) => {
          const matched = allWaterDvList.find(
            (d) => String(d.id) === String(item.id)
          )
          if (matched) showDeviceList.push(matched)
        })
      }

      if (pageType.value === 'editGroup') {
        const groupId = farmStore.s_landId_group
        const irrigationGroups = Array.isArray(farmInfoCache.irrigationGroups)
          ? farmInfoCache.irrigationGroups
          : []
        const groupDviceId = []
        irrigationGroups.forEach((item) => {
          if (String(item.id) !== String(groupId)) return
          ;(item.ports || []).forEach((p) => {
            if (p.deviceId != null) groupDviceId.push(p.deviceId)
          })
        })
        const reGroupDvId = [...new Set(groupDviceId.map((id) => String(id)))]
        if (reGroupDvId.length) {
          showDeviceList = allWaterDvList.filter((d) =>
            reGroupDvId.includes(String(d.id))
          )
        } else {
          groupDeviceList.forEach((item) => {
            const matched = allWaterDvList.find(
              (d) => String(d.id) === String(item.id)
            )
            if (matched) showDeviceList.push(matched)
          })
        }
      }

      allWaterDvList = showDeviceList.length ? showDeviceList : allWaterDvList
    }

    // type=edit：当前地块可编辑，其余地块作为背景层
    let editingLandShape = null
    if (pageType.value === 'edit') {
      const targetId = landId.value || editingLandRecord?.id || farmStore.s_land?.id
      if (!targetId) {
        ElMessage.warning('缺少地块 ID，无法编辑')
        setTimeout(() => fitSceneView(), 200)
        return
      }

      defaultLandList = allLands.filter(
        (item) => String(item.id) !== String(targetId)
      )

      editingLandShape = allLands.find(
        (item) => String(item.id) === String(targetId)
      )

      const rawFromApi = (farmInfoCache.lands || []).find(
        (item) => String(item.id) === String(targetId)
      )
      if (rawFromApi) {
        editingLandRecord = { ...rawFromApi }
      }

      if (!editingLandShape && farmStore.s_land?.landPoint?.length) {
        const draft = farmStore.s_land
        editingLandShape = {
          id: draft.id,
          name: draft.name || draft.landName,
          landPoint: draft.landPoint,
          fillColor: draft.fillColor,
          areaMu: draft.areaMu
        }
        if (!editingLandRecord) {
          editingLandRecord = { ...draft }
        }
      }
    }

    // type=editGroup：加载轮灌组现有灌区到编辑器
    if (pageType.value === 'editGroup') {
      const groupId = farmStore.s_landId_group
      const landGroupList = prepared.landGroupList || []
      editingLandShape = landGroupList.find(
        (item) => String(item.id) === String(groupId)
      )

      // 若草稿已有圈地结果但农场接口尚未更新，优先用草稿
      const draft = farmStore.s_edit_group_draft
      if (
        draft?.id != null &&
        String(draft.id) === String(groupId) &&
        draft.areaJson
      ) {
        try {
          const areaObj =
            typeof draft.areaJson === 'string'
              ? JSON.parse(draft.areaJson)
              : draft.areaJson
          if (areaObj?.landPoint?.length >= 3) {
            editingLandShape = {
              id: draft.id,
              name: draft.name,
              landPoint: areaObj.landPoint,
              fillColor: areaObj.fillColor || '#2196F3',
              areaMu: draft.area
            }
          }
        } catch (e) {
          console.warn('[MapEditPlot] 解析编辑草稿 areaJson 失败', e)
        }
      }
    }

    landPolygonDrawer.drawLandPolygon(map, defaultLandList, {
      layerOptions,
      readOnly: true
    })
    waterDvMarkerDrawer.drawAllWaterDvMarker(map, allWaterDvList, {
      layerOptions
    })
    farmMarkerDrawer.drawAllFarmMarker(
      map,
      [
        {
          ...prepared.farmInfo,
          totalAreaMu: prepared.farmInfo?.totalAreaMu,
          deviceCount: prepared.farmInfo?.deviceCount
        }
      ],
      {
        currentSelectFarmId: prepared.farmInfo?.id,
        layerOptions
      }
    )

    if (pageType.value === 'edit' || pageType.value === 'editGroup') {
      if (editingLandShape?.landPoint?.length >= 3) {
        setTimeout(() => loadLandIntoEditor(editingLandShape), 150)
      } else if (pageType.value === 'edit') {
        ElMessage.warning('地块区域数据无效')
        setTimeout(() => fitSceneView(), 200)
      } else {
        setTimeout(() => fitSceneView(), 200)
      }
      return
    }

    setTimeout(() => fitSceneView(), 200)
  } catch (e) {
    console.error('[MapEditPlot] 加载农场失败', e)
  }
}

const destroyMap = () => {
  unbindDrawingCapture()
  setBackgroundMarkersClickThrough(false)
  clearCurrentEdit()
  if (nowMark && map) {
    try {
      map.remove(nowMark)
    } catch (e) {
      /* ignore */
    }
    nowMark = null
  }
  farmMarkerDrawer.destroy?.(map)
  landPolygonDrawer.destroy?.(map)
  waterDvMarkerDrawer.destroy?.(map)
  if (map) {
    try {
      map.off('click', onMapClick)
      map.destroy()
    } catch (e) {
      console.error('[MapEditPlot] 地图销毁异常', e)
    }
  }
  map = null
  geocoder = null
  mapReady.value = false
}

const initMap = () => {
  if (typeof window.AMap === 'undefined') {
    ElMessage.error('地图 SDK 未加载，请刷新重试')
    return
  }
  const farm = farmStore.selectFarm
  const center =
    farm?.longitude != null && farm?.latitude != null
      ? [Number(farm.longitude), Number(farm.latitude)]
      : [116.397428, 39.90923]

  window.AMap.plugin(['AMap.Geocoder', 'AMap.Geolocation'], () => {
    geocoder = new window.AMap.Geocoder({ radius: 1000, extensions: 'base' })

    map = new window.AMap.Map('edit-plot-map', {
      zoom: 16,
      zooms: [3, 26],
      center,
      viewMode: '2D',
      layers: [new window.AMap.TileLayer.Satellite()],
      resizeEnable: true
    })

    map.on('complete', async () => {
      mapReady.value = true
      map.on('click', onMapClick)
      await loadFarmAndDraw()
    })
  })
}

onMounted(async () => {
  if (pageType.value === 'edit') {
    const draft = farmStore.s_land
    if (draft?.id) {
      editingLandRecord = { ...draft }
      if (!landId.value) {
        ElMessage.warning('缺少地块参数，请从地图编辑入口进入')
      }
    } else if (!landId.value) {
      ElMessage.warning('请先选择要编辑的地块')
    }
  }
  await nextTick()
  initMap()
})

onUnmounted(() => {
  destroyMap()
})
</script>

<style scoped>
.edit-plot-page {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fa;
}

.edit-plot-top {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  z-index: 20;
}

.edit-plot-top__title {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
  color: #0f172a;
}

.edit-plot-back {
  height: 36px;
  padding: 0 14px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  color: #606266;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.edit-plot-back:hover {
  border-color: #3653a0;
  color: #3653a0;
}

.edit-plot-back__arrow {
  font-size: 16px;
  line-height: 1;
}

.edit-plot-map-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.edit-plot-map {
  width: 100%;
  height: 100%;
}

.edit-plot-loading {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.85);
  color: #666;
  font-size: 15px;
}

.edit-plot-tools {
  position: absolute;
  top: 16px;
  right: 68px;
  z-index: 20;
  display: flex;
  gap: 8px;
}

.edit-plot-tools__btn {
  min-width: 64px;
  height: 56px;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 12px;
  color: #909399;
}

.edit-plot-tools__btn .iconfont {
  font-size: 18px;
}

.edit-plot-tools__btn.is-active {
  color: #2755a0;
}

.edit-plot-tools__btn.is-danger {
  color: #f56c6c;
}

.edit-plot-tools__btn.is-disabled {
  color: #c0c4cc;
  cursor: default;
}

.edit-plot-zoom {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit-plot-zoom__btn {
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #333;
  line-height: 1;
}

.edit-plot-zoom__btn:hover {
  background: #f5f5f5;
}

.edit-plot-zoom__locate {
  line-height: 0;
}

.edit-plot-actions {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 32px;
  z-index: 20;
  display: flex;
  justify-content: center;
  gap: 12px;
  pointer-events: none;
}

.edit-plot-actions__btn {
  pointer-events: auto;
  height: 40px;
  padding: 0 22px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.edit-plot-actions__btn.is-primary {
  background: #2755a0;
  color: #fff;
}

.edit-plot-actions__btn.is-primary:hover {
  background: #1f478a;
}

.edit-plot-actions__btn.is-plain {
  background: #fff;
  color: #2755a0;
  border: 1px solid #dcdfe6;
}

.edit-plot-color-mask {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.edit-plot-color-dialog {
  width: 100%;
  max-width: 640px;
  margin-bottom: 0;
  padding: 16px 20px 28px;
  border-radius: 16px 16px 0 0;
  background: #fff;
  box-sizing: border-box;
}

.edit-plot-color-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.edit-plot-color-dialog__header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.edit-plot-color-dialog__ok {
  height: 32px;
  padding: 0 16px;
  border: none;
  border-radius: 16px;
  background: #2755a0;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.edit-plot-color-dialog__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.edit-plot-color-dialog__swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid #e4e7ed;
  cursor: pointer;
  padding: 0;
}

.edit-plot-color-dialog__swatch.is-chose {
  outline: 3px solid #00c800;
  outline-offset: 1px;
}
</style>
