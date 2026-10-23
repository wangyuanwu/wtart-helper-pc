<template>
  <div class="edit-fismart-page">
    <div class="edit-fismart-page__top">
      <h2 class="edit-fismart-page__title">{{ pageTitle }}</h2>
      <button type="button" class="edit-fismart-page__back" @click="onBack">
        ← 返回
      </button>
    </div>

    <div class="edit-fismart-page__tip">拖动可以修改位置</div>

    <div class="edit-fismart-page__map-wrap">
      <div v-if="!mapReady" class="edit-fismart-page__loading">地图加载中...</div>
      <div id="edit-fismart-map" class="edit-fismart-page__map"></div>

      <button
        type="button"
        class="edit-fismart-page__locate"
        title="定位到当前位置"
        @click="getLocation(true)"
      >
        <img :src="LOCATION_NOW_ICON" alt="" />
      </button>
    </div>

    <div class="edit-fismart-page__footer">
      <el-button type="primary" :loading="saving" @click="toOk">
        {{ footerBtnText }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
/**
 * 添加/编辑施肥机地图选点
 * 对齐移动端 pages/home/activity/map/map-edit-fismart
 * returnOnly=true 时仅回传位置给添加物联网设备页，不落库
 */
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { addDevice, batchActivateDevice } from '@/api/device'
import { useFarmStore } from '@/store/farm'
import { prepareFarmMapResources } from '@/utils/farmMapData'
import { createLandPolygonDrawer } from '@/utils/farmMapLand'
import { WATER_DV_MARKER_IMAGES } from '@/utils/farmMapWaterDv'
import { px2rem } from '@/utils/rem'

const LOCATION_NOW_ICON =
  'https://cdzp-oss.farm-net.cn/app/uniapp/water_helper/location_now.png'
/** 对齐移动端 map-edit-fismart markerImages / 中心图标 */
const MARKER_BG_EDITABLE =
  'https://cdzp-oss.farm-net.cn/app/uniapp/water_helper/dv_bg_s.png'
const MARKER_BG_STATIC =
  'https://cdzp-oss.farm-net.cn/app/uniapp/water_helper/dv_bg_n.png'
const FISMART_ICON_ON =
  'https://cdzp-oss.farm-net.cn/app/uniapp/water_helper/fa_on.png'
const FISMART_ICON_OFF =
  'https://cdzp-oss.farm-net.cn/app/uniapp/water_helper/fa_off.png'
const WATER_PORT_ONLINE =
  'https://cdzp-oss.farm-net.cn/app/uniapp/water_helper/dv_on.png'
const WATER_PORT_OFFLINE =
  'https://cdzp-oss.farm-net.cn/app/uniapp/water_helper/dv_off.png'
/** 施肥机 type=52；出水桩 type=50（及其他非 52） */
const FISMART_DEVICE_TYPE = 52
const WATER_DEVICE_TYPE = 50

const route = useRoute()
const router = useRouter()
const farmStore = useFarmStore()
const landPolygonDrawer = createLandPolygonDrawer()

const mapReady = ref(false)
const saving = ref(false)
const pageType = computed(() => String(route.query.type || 'add'))
const pageTitle = computed(() =>
  pageType.value === 'edit' ? '编辑设备' : '添加施肥机'
)
const isLocationReturnOnly = computed(
  () => !!farmStore.s_edit_device_map?.returnOnly
)
const footerBtnText = computed(() => {
  if (pageType.value === 'edit') return '确定修改'
  if (isLocationReturnOnly.value) return '确定'
  return '完成添加'
})

let map = null
let geocoder = null
let nowMark = null
let deviceMarkers = []
let defaultMarkers = []
const landInfo = ref([])
const logicDevicePoints = ref([])
const defaultDevicePoints = ref([])
const selectedDeviceIndex = ref(0)

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

/** 对齐移动端 isFertilizerDevice：仅 type=52 为施肥机；有出水桩数据则按出水桩 */
function isFertilizerDevice(device) {
  if (device?.specificData?.waterOutletPile) return false
  return Number(device?.type) === FISMART_DEVICE_TYPE
}

/**
 * 对齐移动端 getDvImage(device, isDefautMark)：
 * - 本次可拖动施肥机：fa_on
 * - 已有施肥机 type==52：fa_off
 * - 出水桩（type=50 及其他）：按在线态用 dv_on / dv_off
 */
function getDvImage(device, isDefaultMark) {
  if (!isDefaultMark) {
    return FISMART_ICON_ON
  }
  if (isFertilizerDevice(device)) {
    return FISMART_ICON_OFF
  }
  const isOnline = resolveDeviceOnline(device)
  const ports = Array.isArray(device?.specificData?.waterOutletPile?.ports)
    ? device.specificData.waterOutletPile.ports
    : []
  // 与移动端一致：2/0 口与 4 口均用 dv_on / dv_off；本地 SVG 仅作 CDN 失败兜底
  const onlineSrc = WATER_PORT_ONLINE || WATER_DV_MARKER_IMAGES.online
  const offlineSrc = WATER_PORT_OFFLINE || WATER_DV_MARKER_IMAGES.offline
  if (ports.length === 4) {
    return isOnline ? onlineSrc : offlineSrc
  }
  return isOnline ? onlineSrc : offlineSrc
}

/**
 * 对齐移动端 createDeviceMarker / createDefaultDeviceMarker：
 * 底图钉（dv_bg_s / dv_bg_n）+ 中心类型图标（fa_* / dv_*）
 */
function createDeviceMarkerContent(device, { isDefault = false } = {}) {
  const MARKER_SIZE = isDefault ? 45 : 50
  const LABEL_TOP = isDefault ? -20 : -28
  const LABEL_FONT_SIZE = isDefault ? 12 : 14
  const overlaySrc = getDvImage(device, isDefault)
  const bgSrc = isDefault ? MARKER_BG_STATIC : MARKER_BG_EDITABLE
  const isFismart = !isDefault || isFertilizerDevice(device)
  const fallbackName = isFismart ? '施肥机' : '出水桩'
  const nameText = device.name || device.deviceCode || fallbackName

  const dom = document.createElement('div')
  dom.style.cssText = [
    'position:relative',
    `width:${px2rem(MARKER_SIZE)}`,
    `height:${px2rem(MARKER_SIZE)}`,
    isDefault ? 'cursor:default' : 'cursor:grab',
    `z-index:${isDefault ? 9998 : 9999}`,
    'overflow:visible',
    'background:transparent',
    'transform-origin:center bottom'
  ].join(';')

  const nameLabel = document.createElement('div')
  nameLabel.style.cssText = [
    'position:absolute',
    `top:${px2rem(LABEL_TOP)}`,
    'left:50%',
    'transform:translateX(-50%)',
    'color:#fff',
    `font-size:${px2rem(LABEL_FONT_SIZE)}`,
    'white-space:nowrap',
    'text-shadow:0 0 2px #000',
    'z-index:10',
    'pointer-events:none',
    !isDefault
      ? 'background-color:#3C82F6;border-radius:4px;padding:2px 6px'
      : ''
  ]
    .filter(Boolean)
    .join(';')
  nameLabel.textContent = nameText
  dom.appendChild(nameLabel)

  const bgImg = document.createElement('img')
  bgImg.className = 'device-marker-image'
  bgImg.src = bgSrc
  bgImg.alt = ''
  bgImg.style.cssText = [
    'position:absolute',
    'left:0',
    'top:0',
    'width:100%',
    'height:100%',
    'object-fit:contain',
    'pointer-events:none'
  ].join(';')
  dom.appendChild(bgImg)

  const arrowWrap = document.createElement('div')
  arrowWrap.className = 'device-arrow-container'
  arrowWrap.style.cssText = [
    'position:absolute',
    'left:50%',
    'top:45%',
    'transform:translate(-50%,-50%)',
    'width:60%',
    'height:60%',
    'pointer-events:none'
  ].join(';')

  if (isDefault) {
    const mask = document.createElement('div')
    mask.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:50%',
      'transform:translate(-50%,-50%)',
      'width:120%',
      'height:120%',
      'background-color:rgba(0,0,0,0.2)',
      'border-radius:50%'
    ].join(';')
    arrowWrap.appendChild(mask)
  }

  const overlayImg = document.createElement('img')
  overlayImg.className = 'device-arrow-image'
  overlayImg.src = overlaySrc
  overlayImg.alt = ''
  overlayImg.dataset.deviceType = String(
    device?.type != null ? device.type : isFismart ? FISMART_DEVICE_TYPE : WATER_DEVICE_TYPE
  )
  overlayImg.style.cssText = [
    'position:absolute',
    'left:0',
    'top:0',
    'width:100%',
    'height:100%',
    'object-fit:contain',
    'z-index:5',
    'pointer-events:none'
  ].join(';')
  // CDN 失败时出水桩回退本地 SVG，避免误显示成空白/施肥机感
  if (!isFismart) {
    overlayImg.onerror = () => {
      overlayImg.onerror = null
      overlayImg.src = resolveDeviceOnline(device)
        ? WATER_DV_MARKER_IMAGES.online
        : WATER_DV_MARKER_IMAGES.offline
    }
  }
  arrowWrap.appendChild(overlayImg)
  dom.appendChild(arrowWrap)

  return dom
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
      zIndex: 9998
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

    const marker = new window.AMap.Marker({
      position: [lng, lat],
      content: createDeviceMarkerContent(device),
      anchor: 'bottom-center',
      draggable: true,
      zIndex: 9999 + index
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
    })

    marker.on('click', () => {
      selectedDeviceIndex.value = index
    })

    map.add(marker)
    deviceMarkers.push(marker)
  })
}

function syncEditDeviceMap() {
  const mapData = farmStore.s_edit_device_map || {
    deviceListOK: [],
    deviceListNo: [],
    returnOnly: false
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
  farmStore.setEditDeviceMap({
    deviceListOK: ok,
    deviceListNo: no,
    returnOnly: !!mapData.returnOnly
  })
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

  logicDevicePoints.value = [
    ...(mapData.deviceListOK || []),
    ...(mapData.deviceListNo || [])
  ].map((item) => ({ ...item, farmId }))

  if (!logicDevicePoints.value.length) {
    ElMessage.warning('没有待添加的设备')
    router.replace('/device/add-iot')
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

  // full 接口 devices：按 type 分类绘制（出水桩 type=50 / 施肥机 type=52）
  const farmDevices = Array.isArray(info?.devices)
    ? info.devices
    : prepared.waterDvList || []
  defaultDevicePoints.value = farmDevices
    .filter((item) => {
      if (item.id != null && editingIds.has(String(item.id))) return false
      if (item.deviceCode != null && editingCodes.has(String(item.deviceCode))) {
        return false
      }
      return item.longitude != null && item.latitude != null
    })
    .map((item) => {
      const rawType = item.type
      const typeNum =
        rawType != null && rawType !== '' ? Number(rawType) : NaN
      // 有出水桩数据时强制按出水桩绘制，避免 type 异常时误用施肥机图标
      const type = item?.specificData?.waterOutletPile
        ? WATER_DEVICE_TYPE
        : Number.isFinite(typeNum)
          ? typeNum
          : rawType
      return {
        id: item.id,
        farmId: item.farmId,
        landId: item.landId,
        type,
        name: item.name,
        deviceCode: item.deviceCode,
        address: item.address,
        longitude: item.longitude,
        latitude: item.latitude,
        coordinateType: item.coordinateType,
        orientationAngle: item.orientationAngle,
        isOnline: item.isOnline,
        specificData: item.specificData
      }
    })

  landPolygonDrawer.drawLandPolygon(map, landInfo.value, { readOnly: true })
  drawDefaultDeviceMarkers()
  drawDeviceMarkers()
  await batchUpdateDeviceAddress()
  nextTick(() => {
    fitView()
    getLocation(false)
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

    map = new window.AMap.Map('edit-fismart-map', {
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
        console.error('[MapEditFismart] 加载农场数据失败', e)
        ElMessage.error('加载地图数据失败')
      }
    })
  })
}

/** 对齐移动端 toOk：returnOnly 回传位置；否则落库添加 */
async function toOk() {
  if (!logicDevicePoints.value.length) {
    ElMessage.warning('没有待添加的设备')
    return
  }

  matchLandIds()
  await batchUpdateDeviceAddress()
  syncEditDeviceMap()

  if (isLocationReturnOnly.value) {
    const list = logicDevicePoints.value.map((item) => ({ ...item }))
    // PC 表单页可能尚未挂载：先落缓冲，再发 deviceMsg（对齐移动端 addLocationConform）
    farmStore.setPendingIotLocation(list)
    farmStore.notifyDeviceMsg({
      topic: 'addLocationConform',
      data: list
    })
    router.back()
    return
  }

  saving.value = true
  try {
    await addDevice(logicDevicePoints.value)
    const deviceCodes = logicDevicePoints.value.map((d) => d.deviceCode)
    try {
      await batchActivateDevice({ deviceCodes }, { silent: true })
    } catch (e) {
      console.warn('[MapEditFismart] batchActivate 失败', e)
    }
    ElMessage.success('操作成功')
    farmStore.setEditDevice([])
    farmStore.setEditDeviceMap({
      deviceListOK: [],
      deviceListNo: [],
      returnOnly: false
    })
    await farmStore.fetchFarmList()
    farmStore.notifyAddNewDevice()
    router.replace('/map')
  } catch (e) {
    console.error('[MapEditFismart] 添加设备失败', e)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  nextTick(() => initMap())
})

onUnmounted(() => {
  destroyMap()
})
</script>

<style scoped>
.edit-fismart-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f7fafc;
  box-sizing: border-box;
}

.edit-fismart-page__top {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px 8px;
}

.edit-fismart-page__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}

.edit-fismart-page__back {
  border: none;
  background: transparent;
  color: #3653a0;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}

.edit-fismart-page__back:hover {
  opacity: 0.85;
}

.edit-fismart-page__tip {
  margin: 0 24px 12px;
  display: inline-flex;
  align-self: flex-start;
  padding: 6px 14px;
  border-radius: 999px;
  background: #fff;
  color: #303133;
  font-size: 13px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.edit-fismart-page__map-wrap {
  position: relative;
  flex: 1;
  min-height: 360px;
  margin: 0 24px;
  border-radius: 16px;
  overflow: hidden;
  background: #e8eef5;
}

.edit-fismart-page__map {
  width: 100%;
  height: 100%;
}

.edit-fismart-page__loading {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #666;
  font-size: 14px;
}

.edit-fismart-page__locate {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 3;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.edit-fismart-page__locate img {
  width: 28px;
  height: 28px;
  display: block;
}

.edit-fismart-page__locate:hover {
  background: #f5f7fa;
}

.edit-fismart-page__footer {
  display: flex;
  justify-content: center;
  padding: 16px 24px 24px;
}

.edit-fismart-page__footer :deep(.el-button) {
  min-width: 220px;
  height: 42px;
  border-radius: 10px;
  background: #274082;
  border-color: #274082;
  font-weight: 600;
}
</style>
