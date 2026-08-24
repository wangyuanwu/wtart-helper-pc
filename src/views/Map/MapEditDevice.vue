<template>
  <div class="edit-device-page">
    <div class="edit-device-page__top">
      <h2 class="edit-device-page__title">{{ pageTitle }}</h2>
      <button type="button" class="edit-device-page__back" @click="onBack">
        ← 返回
      </button>
    </div>

    <div class="edit-device-page__tip">
      <span>拖动可以修改位置/</span>
      <button
        type="button"
        class="edit-device-page__tip-link"
        @click="openOrientationFromTip"
      >
        点击可修改设备朝向
      </button>
    </div>

    <div class="edit-device-page__map-wrap">
      <div v-if="!mapReady" class="edit-device-page__loading">地图加载中...</div>
      <div id="edit-device-map" class="edit-device-page__map"></div>

      <button
        type="button"
        class="edit-device-page__locate"
        title="定位到当前位置"
        @click="getLocation(true)"
      >
        <img :src="LOCATION_NOW_ICON" alt="" />
      </button>

      <DeviceOrientationPanel
        v-model="orientVisible"
        :view-angle="orientViewAngle"
        :is-all-set="isAllSet"
        @confirm="onOrientConfirm"
        @confirm-all="onOrientConfirmAll"
      />
    </div>

    <div class="edit-device-page__footer">
      <!-- 对齐移动端：add 先「朝向设置」再「完成添加」 -->
      <template v-if="pageType === 'add'">
        <el-button
          v-if="!isClickNext"
          type="primary"
          @click="toGetReverse"
        >
          朝向设置
        </el-button>
        <el-button
          v-else
          type="primary"
          :loading="saving"
          @click="toOk"
        >
          完成添加
        </el-button>
      </template>
      <el-button
        v-else
        type="primary"
        :loading="saving"
        @click="toEditOk"
      >
        确定修改
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { addDevice, batchActivateDevice } from '@/api/device'
import { useFarmStore } from '@/store/farm'
import { prepareFarmMapResources } from '@/utils/farmMapData'
import { createLandPolygonDrawer } from '@/utils/farmMapLand'
import { WATER_DV_MARKER_IMAGES } from '@/utils/farmMapWaterDv'
import { px2rem } from '@/utils/rem'
import DeviceOrientationPanel from './DeviceOrientationPanel.vue'

/** 对齐 MapEditPlot / 移动端定位图标 */
const LOCATION_NOW_ICON =
  'https://cdzp-oss.farm-net.cn/app/uniapp/water_helper/location_now.png'

const route = useRoute()
const router = useRouter()
const farmStore = useFarmStore()
const landPolygonDrawer = createLandPolygonDrawer()

const mapReady = ref(false)
const saving = ref(false)
const isClickNext = ref(false)
const pageType = computed(() => String(route.query.type || 'add'))
const pageEvent = computed(() => String(route.query.event || ''))
const pageTitle = computed(() =>
  pageType.value === 'edit' ? '编辑设备' : '添加设备'
)

let map = null
let geocoder = null
let nowMark = null
let deviceMarkers = []
let defaultMarkers = []
const landInfo = ref([])
const logicDevicePoints = ref([])
const defaultDevicePoints = ref([])
const selectedDeviceIndex = ref(0)
const orientVisible = ref(false)
const orientViewAngle = ref(0)
const isAllSet = computed(() => logicDevicePoints.value.length > 1)

function normalizeAngle(angle) {
  const num = Number(angle) || 0
  return ((num % 360) + 360) % 360
}

function onBack() {
  router.back()
}

function isPointInPolygon(pointLng, pointLat, polygonlandPoint) {
  let inside = false
  for (
    let i = 0, j = polygonlandPoint.length - 1;
    i < polygonlandPoint.length;
    j = i++
  ) {
    const iLng = polygonlandPoint[i].lng
    const iLat = polygonlandPoint[i].lat
    const jLng = polygonlandPoint[j].lng
    const jLat = polygonlandPoint[j].lat
    const intersect =
      iLat > pointLat !== jLat > pointLat &&
      pointLng <
        ((jLng - iLng) * (pointLat - iLat)) / (jLat - iLat) + iLng
    if (intersect) inside = !inside
  }
  return inside
}

function generateRandomDeviceCoord() {
  const devices = logicDevicePoints.value
  const lands = landInfo.value
  if (!devices.length || !lands.length) return

  const firstLand = lands[0]
  const pointList = firstLand.landPoint
  if (!Array.isArray(pointList) || pointList.length < 3) return

  const pointLen = pointList.length
  devices.forEach((device) => {
    if (
      device.longitude &&
      device.latitude &&
      device.longitude !== 0 &&
      device.latitude !== 0
    ) {
      return
    }
    const randomEdgeIndex = Math.floor(Math.random() * pointLen)
    const p1 = pointList[randomEdgeIndex]
    const p2 = pointList[(randomEdgeIndex + 1) % pointLen]
    const t = Math.random()
    device.longitude = Number((p1.lng + t * (p2.lng - p1.lng)).toFixed(8))
    device.latitude = Number((p1.lat + t * (p2.lat - p1.lat)).toFixed(8))
  })
}

function clearDeviceMarkers() {
  deviceMarkers.forEach((m) => {
    try {
      map?.remove(m)
    } catch {
      /* ignore */
    }
  })
  deviceMarkers = []
}

function clearDefaultMarkers() {
  defaultMarkers.forEach((m) => {
    try {
      map?.remove(m)
    } catch {
      /* ignore */
    }
  })
  defaultMarkers = []
}

/** 对齐移动端 getDeviceAddress */
function getDeviceAddress(device) {
  return new Promise((resolve) => {
    if (!geocoder || device.longitude == null || device.latitude == null) {
      resolve()
      return
    }
    geocoder.getAddress(
      [device.longitude, device.latitude],
      (status, result) => {
        if (
          status === 'complete' &&
          result.info === 'OK' &&
          result.regeocode
        ) {
          device.address =
            result.regeocode.formattedAddress || '未知地址'
        } else {
          device.address = device.address || '地址解析失败'
        }
        resolve()
      }
    )
  })
}

async function batchUpdateDeviceAddress() {
  for (const item of logicDevicePoints.value) {
    await getDeviceAddress(item)
  }
  syncEditDeviceMap()
}

function resolveDeviceOnline(device) {
  const v = device?.isOnline
  if (v === true || v === 1 || v === '1') return true
  if (v === false || v === 0 || v === '0') return false
  return !!v
}

function getDeviceMarkerIconSrc(device, { isDefault = false, isSelected = false } = {}) {
  const isOnline = resolveDeviceOnline(device)
  const normalSrc = isOnline
    ? WATER_DV_MARKER_IMAGES.online
    : WATER_DV_MARKER_IMAGES.offline
  const activeSrc = isOnline
    ? WATER_DV_MARKER_IMAGES.onlineActive
    : WATER_DV_MARKER_IMAGES.offlineActive
  if (isDefault || !isSelected) return { normalSrc, activeSrc, iconSrc: normalSrc }
  return { normalSrc, activeSrc, iconSrc: activeSrc }
}

function createDeviceMarkerContent(
  device,
  { isDefault = false, isSelected = false } = {}
) {
  const MARKER_SIZE = isDefault ? 40 : 48
  const LABEL_FONT_SIZE = isDefault ? 11 : 12
  const ICON_LABEL_GAP = 2
  const { normalSrc, activeSrc, iconSrc } = getDeviceMarkerIconSrc(device, {
    isDefault,
    isSelected
  })
  const calibratedAngle =
    device.orientationAngle != null
      ? normalizeAngle(Number(device.orientationAngle) - 45)
      : 0

  const dom = document.createElement('div')
  dom.style.cssText = [
    'position:relative',
    `width:${px2rem(Math.max(MARKER_SIZE, 100))}`,
    'height:auto',
    `min-height:${px2rem(MARKER_SIZE + LABEL_FONT_SIZE + ICON_LABEL_GAP)}`,
    isDefault ? 'cursor:default' : 'cursor:pointer',
    isSelected ? 'transform:scale(1.1)' : 'transform:scale(1)',
    'transform-origin:center bottom',
    `z-index:${isDefault ? 8000 : isSelected ? 20000 : 15000}`,
    'overflow:visible',
    'background:transparent',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    isDefault ? 'opacity:0.85' : ''
  ]
    .filter(Boolean)
    .join(';')

  const iconContainer = document.createElement('div')
  iconContainer.style.cssText = [
    'position:relative',
    `width:${px2rem(MARKER_SIZE + 16)}`,
    `height:${px2rem(MARKER_SIZE + 16)}`,
    `margin-bottom:${px2rem(ICON_LABEL_GAP)}`,
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'overflow:visible'
  ].join(';')

  const rotateWrap = document.createElement('div')
  rotateWrap.className = 'device-rotate-wrap'
  rotateWrap.style.cssText = [
    'position:relative',
    `width:${px2rem(MARKER_SIZE)}`,
    `height:${px2rem(MARKER_SIZE)}`,
    `transform:rotate(${calibratedAngle}deg)`,
    'transform-origin:center center',
    'pointer-events:none'
  ].join(';')

  if (isDefault) {
    const mask = document.createElement('div')
    mask.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:50%',
      'transform:translate(-50%,-50%)',
      `width:${px2rem(MARKER_SIZE * 0.72)}`,
      `height:${px2rem(MARKER_SIZE * 0.72)}`,
      'border-radius:50%',
      'background:rgba(0,0,0,0.28)',
      'z-index:1'
    ].join(';')
    rotateWrap.appendChild(mask)
  }

  const iconImg = document.createElement('img')
  iconImg.className = 'device-marker-image'
  iconImg.src = iconSrc
  iconImg.dataset.normalSrc = normalSrc
  iconImg.dataset.activeSrc = activeSrc
  iconImg.alt = ''
  iconImg.style.cssText = [
    `width:${px2rem(MARKER_SIZE)}`,
    `height:${px2rem(MARKER_SIZE)}`,
    'max-width:none',
    'object-fit:contain',
    'display:block',
    'pointer-events:none',
    'position:relative',
    'z-index:2'
  ].join(';')
  rotateWrap.appendChild(iconImg)
  iconContainer.appendChild(rotateWrap)
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
  nameLabel.textContent = device.name || device.deviceCode || '设备'
  dom.appendChild(nameLabel)

  return dom
}

function refreshDeviceMarkerIcons() {
  deviceMarkers.forEach((marker, index) => {
    const device = logicDevicePoints.value[index]
    const dom = marker.getContent?.()
    if (!dom || !device) return

    const isSelected = index === selectedDeviceIndex.value
    const { normalSrc, activeSrc, iconSrc } = getDeviceMarkerIconSrc(device, {
      isSelected
    })
    const img = dom.querySelector('.device-marker-image')
    if (img) {
      img.dataset.normalSrc = normalSrc
      img.dataset.activeSrc = activeSrc
      img.src = iconSrc
    }
    dom.style.transform = isSelected ? 'scale(1.1)' : 'scale(1)'
    dom.style.zIndex = isSelected ? '20000' : '15000'
    marker.setzIndex?.(isSelected ? 20000 + index : 15000 + index)
  })
}

function openOrientationPanel(index) {
  selectedDeviceIndex.value = index
  refreshDeviceMarkerIcons()
  const cur = logicDevicePoints.value[index]
  if (!cur) return
  orientViewAngle.value = normalizeAngle(
    Number(cur.orientationAngle || 0) - 45
  )
  isClickNext.value = true
  orientVisible.value = true
}

/** 对齐移动端 toGetReverse：默认选中第一台并打开朝向 */
function toGetReverse() {
  if (!logicDevicePoints.value.length) {
    ElMessage.warning('暂无设备')
    return
  }
  openOrientationPanel(0)
}

function openOrientationFromTip() {
  toGetReverse()
}

function applyStoreAngle(reg) {
  return normalizeAngle(Number(reg) + 45)
}

function onOrientConfirm({ deg }) {
  const idx = selectedDeviceIndex.value
  const cur = logicDevicePoints.value[idx]
  if (!cur) return
  cur.orientationAngle = applyStoreAngle(deg)
  isClickNext.value = true
  syncEditDeviceMap()
  drawDeviceMarkers()
  orientVisible.value = false
  ElMessage({ message: '朝向已更新', duration: 1500 })
}

async function onOrientConfirmAll({ deg }) {
  try {
    await ElMessageBox.confirm(
      '若批量添加设备，此处将统一设置所有的出水口朝向一样。如需修改朝向，后期可在单个出水桩详情中，按照实际朝向进行修改。',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
        customClass: 'edit-device-batch-orient-box'
      }
    )
  } catch {
    return
  }
  const storeAngle = applyStoreAngle(deg)
  logicDevicePoints.value.forEach((item) => {
    item.orientationAngle = storeAngle
  })
  isClickNext.value = true
  syncEditDeviceMap()
  drawDeviceMarkers()
  orientVisible.value = false
  ElMessage({ message: '朝向已统一设置', duration: 1500 })
}

function drawDefaultDeviceMarkers() {
  if (!map || typeof window.AMap === 'undefined') return
  clearDefaultMarkers()

  defaultDevicePoints.value.forEach((device) => {
    const lng = Number(device.longitude)
    const lat = Number(device.latitude)
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return

    const marker = new window.AMap.Marker({
      position: [lng, lat],
      content: createDeviceMarkerContent(device, { isDefault: true }),
      anchor: 'bottom-center',
      draggable: false,
      zIndex: 8000
    })
    map.add(marker)
    defaultMarkers.push(marker)
  })
}

function drawDeviceMarkers() {
  if (!map || typeof window.AMap === 'undefined') return
  clearDeviceMarkers()

  logicDevicePoints.value.forEach((device, index) => {
    const lng = Number(device.longitude)
    const lat = Number(device.latitude)
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return

    let dragged = false
    const marker = new window.AMap.Marker({
      position: [lng, lat],
      content: createDeviceMarkerContent(device, {
        isDefault: false,
        isSelected: index === selectedDeviceIndex.value
      }),
      anchor: 'bottom-center',
      draggable: true,
      zIndex: 15000 + index + (index === selectedDeviceIndex.value ? 5000 : 0)
    })

    marker.on('dragstart', () => {
      dragged = true
    })

    marker.on('dragend', async () => {
      const pos = marker.getPosition()
      if (pos) {
        logicDevicePoints.value[index].longitude = pos.lng
        logicDevicePoints.value[index].latitude = pos.lat
        await getDeviceAddress(logicDevicePoints.value[index])
        syncEditDeviceMap()
        ElMessage({ message: '位置已更新', duration: 1500, grouping: true })
      }
      setTimeout(() => {
        dragged = false
      }, 80)
    })

    marker.on('click', () => {
      if (dragged) return
      openOrientationPanel(index)
    })

    map.add(marker)
    deviceMarkers.push(marker)
  })
}

function syncEditDeviceMap() {
  if (pageType.value === 'edit') {
    // 编辑态移动端 vuex_edit_device_map 为数组；PC 统一落到 OK 列表
    farmStore.setEditDeviceMap({
      deviceListOK: logicDevicePoints.value.map((item) => ({ ...item })),
      deviceListNo: []
    })
    return
  }
  const mapData = farmStore.s_edit_device_map || {
    deviceListOK: [],
    deviceListNo: []
  }
  const codeSet = new Set(logicDevicePoints.value.map((d) => d.deviceCode))
  const ok = (mapData.deviceListOK || [])
    .filter((d) => codeSet.has(d.deviceCode))
    .map((d) => {
      const latest = logicDevicePoints.value.find(
        (x) => x.deviceCode === d.deviceCode
      )
      return latest ? { ...d, ...latest } : d
    })
  const no = (mapData.deviceListNo || [])
    .filter((d) => codeSet.has(d.deviceCode))
    .map((d) => {
      const latest = logicDevicePoints.value.find(
        (x) => x.deviceCode === d.deviceCode
      )
      return latest ? { ...d, ...latest } : d
    })
  const covered = new Set([...ok, ...no].map((d) => d.deviceCode))
  logicDevicePoints.value.forEach((d) => {
    if (!covered.has(d.deviceCode)) ok.push({ ...d })
  })
  farmStore.setEditDeviceMap({ deviceListOK: ok, deviceListNo: no })
}

function fitView() {
  if (!map) return
  const points = []
  landInfo.value.forEach((land) => {
    ;(land.landPoint || []).forEach((p) => {
      if (p?.lng && p?.lat) points.push([p.lng, p.lat])
    })
  })
  logicDevicePoints.value.forEach((d) => {
    if (d.longitude && d.latitude) points.push([d.longitude, d.latitude])
  })
  defaultDevicePoints.value.forEach((d) => {
    if (d.longitude && d.latitude) points.push([d.longitude, d.latitude])
  })
  if (points.length) {
    map.setFitView(
      points.map((p) => new window.AMap.Marker({ position: p })),
      false,
      [60, 60, 60, 60]
    )
  }
}

/** 对齐移动端 getLocation：定位并标记当前位置 */
function getLocation(needCenter = true) {
  if (!map || typeof window.AMap === 'undefined') {
    ElMessage.warning('地图加载中...')
    return
  }
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
          } catch {
            /* ignore */
          }
        }
        nowMark = new window.AMap.Marker({
          map,
          position: [lng, lat],
          offset: new window.AMap.Pixel(-18, -36),
          content: `<img src="${LOCATION_NOW_ICON}" style="width:36px;height:36px;display:block;" />`,
          zIndex: 30000
        })
        if (needCenter) {
          map.setZoomAndCenter(17, [lng, lat])
        }
      } else {
        ElMessage.warning('定位失败')
      }
    })
  })
}

function matchLandIds() {
  const farmId =
    farmStore.s_selectFarm?.id ?? farmStore.selectFarm?.id ?? null
  logicDevicePoints.value.forEach((device) => {
    device.landId = null
    device.farmId = farmId
  })
  landInfo.value.forEach((landItem) => {
    const polygon = landItem.landPoint || []
    if (polygon.length < 3) return
    logicDevicePoints.value.forEach((device) => {
      if (isPointInPolygon(device.longitude, device.latitude, polygon)) {
        device.landId = landItem.id
        device.landName = landItem.name
      }
    })
  })
}

async function loadFarmAndDraw() {
  const farmId =
    farmStore.s_selectFarm?.id ?? farmStore.selectFarm?.id ?? null
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    router.replace('/device')
    return
  }

  const info = await farmStore.fetchFarmFullInfo(farmId)
  const prepared = prepareFarmMapResources(info)
  landInfo.value = (prepared.landList || []).map((land) => ({
    id: land.id,
    name: land.name,
    areaMu: land.area,
    landPoint: land.landPoint || [],
    fillColor: land.fillColor
  }))

  const mapData = farmStore.s_edit_device_map || {
    deviceListOK: [],
    deviceListNo: []
  }

  if (pageType.value === 'edit') {
    const fromMap = [
      ...(mapData.deviceListOK || []),
      ...(mapData.deviceListNo || [])
    ]
    const fromEdit = Array.isArray(farmStore.s_edit_device)
      ? farmStore.s_edit_device
      : []
    logicDevicePoints.value = (fromMap.length ? fromMap : fromEdit).map(
      (item) => {
        const live = (prepared.waterDvList || []).find(
          (dev) =>
            (item.id != null && String(dev.id) === String(item.id)) ||
            (item.deviceCode != null &&
              String(dev.deviceCode) === String(item.deviceCode))
        )
        return {
          ...item,
          farmId,
          isOnline: live?.isOnline ?? item.isOnline
        }
      }
    )
  } else {
    logicDevicePoints.value = [
      ...(mapData.deviceListOK || []),
      ...(mapData.deviceListNo || [])
    ].map((item) => ({ ...item, farmId }))
  }

  if (!logicDevicePoints.value.length) {
    ElMessage.warning(
      pageType.value === 'edit' ? '没有待编辑的设备' : '没有待添加的设备'
    )
    router.replace(pageType.value === 'edit' ? '/device' : '/device/add-number')
    return
  }

  if (pageType.value === 'add') {
    generateRandomDeviceCoord()
  }

  const editingCodes = new Set(
    logicDevicePoints.value.map((d) => String(d.deviceCode))
  )
  const editingIds = new Set(
    logicDevicePoints.value
      .map((d) => d.id)
      .filter((id) => id != null)
      .map(String)
  )

  defaultDevicePoints.value = (prepared.waterDvList || [])
    .filter((item) => {
      if (item.id != null && editingIds.has(String(item.id))) return false
      if (item.deviceCode != null && editingCodes.has(String(item.deviceCode))) {
        return false
      }
      return item.longitude != null && item.latitude != null
    })
    .map((item) => ({
      farmId: item.farmId,
      landId: item.landId,
      type: item.type,
      name: item.name,
      deviceCode: item.deviceCode,
      address: item.address,
      longitude: item.longitude,
      latitude: item.latitude,
      coordinateType: item.coordinateType,
      orientationAngle: item.orientationAngle,
      isOnline: item.isOnline,
      specificData: item.specificData
    }))

  landPolygonDrawer.drawLandPolygon(map, landInfo.value, { readOnly: true })
  drawDefaultDeviceMarkers()
  drawDeviceMarkers()
  await batchUpdateDeviceAddress()
  nextTick(() => {
    fitView()
    getLocation(false)
    // event=angle：进入后直接打开朝向面板，便于从详情「设备方位」进入
    if (pageType.value === 'edit' && pageEvent.value === 'angle') {
      openOrientationPanel(0)
    }
  })
}

function destroyMap() {
  clearDeviceMarkers()
  clearDefaultMarkers()
  if (nowMark) {
    try {
      map?.remove(nowMark)
    } catch {
      /* ignore */
    }
    nowMark = null
  }
  landPolygonDrawer.destroy?.(map)
  if (map) {
    map.destroy()
    map = null
  }
  geocoder = null
  mapReady.value = false
}

function initMap() {
  if (typeof window.AMap === 'undefined') {
    ElMessage.error('地图 SDK 未加载，请刷新重试')
    return
  }
  const farm = farmStore.selectFarm || farmStore.s_selectFarm
  const center =
    farm?.longitude != null && farm?.latitude != null
      ? [Number(farm.longitude), Number(farm.latitude)]
      : [116.397428, 39.90923]

  window.AMap.plugin(['AMap.Geocoder', 'AMap.Geolocation'], () => {
    geocoder = new window.AMap.Geocoder({ radius: 1000, extensions: 'base' })

    map = new window.AMap.Map('edit-device-map', {
      zoom: 16,
      zooms: [3, 26],
      center,
      viewMode: '2D',
      layers: [new window.AMap.TileLayer.Satellite()],
      resizeEnable: true
    })

    map.on('complete', async () => {
      mapReady.value = true
      try {
        await loadFarmAndDraw()
      } catch (e) {
        console.error('[MapEditDevice] 加载农场数据失败', e)
        ElMessage.error('加载地图数据失败')
      }
    })
  })
}

async function toOk() {
  if (!logicDevicePoints.value.length) {
    ElMessage.warning('没有待添加的设备')
    return
  }

  matchLandIds()
  syncEditDeviceMap()
  saving.value = true
  try {
    await addDevice(logicDevicePoints.value)
    const deviceCodes = logicDevicePoints.value.map((d) => d.deviceCode)
    try {
      await batchActivateDevice({ deviceCodes }, { silent: true })
    } catch (e) {
      console.warn('[MapEditDevice] batchActivate 失败', e)
    }
    ElMessage.success('操作成功')
    farmStore.setEditDevice([])
    farmStore.setEditDeviceMap({ deviceListOK: [], deviceListNo: [] })
    await farmStore.fetchFarmList()
    // 对齐移动端 addNewDeviceOk：通知地图启动新增设备刷新定时器
    farmStore.notifyAddNewDevice()
    // 对齐移动端 redirectTo 首页：PC 进地图首页
    router.replace('/map')
  } catch (e) {
    console.error('[MapEditDevice] 添加设备失败', e)
  } finally {
    saving.value = false
  }
}

/** 对齐移动端 toEditOk：匹配地块后回传详情页，不在此处落库 */
async function toEditOk() {
  if (!logicDevicePoints.value.length) {
    ElMessage.warning('没有待编辑的设备')
    return
  }
  matchLandIds()
  await batchUpdateDeviceAddress()
  syncEditDeviceMap()
  farmStore.setPendingDeviceEdit(logicDevicePoints.value)
  ElMessage.success('地块关联匹配完成')
  router.back()
}

onMounted(() => {
  isClickNext.value = pageType.value === 'edit'
  nextTick(() => initMap())
})

onUnmounted(() => {
  destroyMap()
})
</script>

<style scoped>
.edit-device-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f7fafc;
  box-sizing: border-box;
}

.edit-device-page__top {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px 8px;
}

.edit-device-page__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}

.edit-device-page__back {
  border: none;
  background: transparent;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
}

.edit-device-page__back:hover {
  color: #3653a0;
}

.edit-device-page__tip {
  margin: 0 24px 10px;
  align-self: flex-start;
  padding: 6px 12px;
  border-radius: 16px;
  background: #fff;
  color: #303133;
  font-size: 13px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
}

.edit-device-page__tip-link {
  border: none;
  padding: 0;
  background: transparent;
  color: #3653a0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.edit-device-page__tip-link:hover {
  color: #2d4590;
}

.edit-device-page__map-wrap {
  position: relative;
  flex: 1;
  min-height: 360px;
  margin: 0 24px;
  border-radius: 12px;
  overflow: hidden;
  background: #dfe6ee;
}

.edit-device-page__map {
  width: 100%;
  height: 100%;
}

.edit-device-page__loading {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.88);
  color: #606266;
  font-size: 14px;
}

.edit-device-page__locate {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 20;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-device-page__locate img {
  width: 28px;
  height: 28px;
  display: block;
}

.edit-device-page__locate:hover {
  background: #f5f7fa;
}

.edit-device-page__footer {
  display: flex;
  justify-content: center;
  padding: 16px 24px;
  background: #fff;
  border-top: 1px solid #ebeef5;
}

.edit-device-page__footer :deep(.el-button) {
  min-width: 220px;
  height: 40px;
  border-radius: 20px;
  background: #3653a0;
  border-color: #3653a0;
}
</style>
