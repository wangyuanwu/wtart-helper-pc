<template>
  <div class="map-edit-group-page">
    <div class="map-edit-group-page__map-wrap">
      <div v-if="!mapReady" class="map-edit-group-page__loading">地图加载中...</div>
      <div id="edit-group-map" class="map-edit-group-page__map"></div>
    </div>

    <ChoseWaterOutPanel
      ref="panelRef"
      :from="pageFrom"
      @change-land="onChangeLand"
      @close="onClose"
    />
  </div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getFarmInfo } from '@/api/map'
import { useFarmStore } from '@/store/farm'
import { prepareFarmMapResources } from '@/utils/farmMapData'
import { createLandPolygonDrawer } from '@/utils/farmMapLand'
import { createWaterDvMarkerDrawer } from '@/utils/farmMapWaterDv'
import ChoseWaterOutPanel from '@/views/IrrigationGroup/ChoseWaterOutPanel.vue'

const route = useRoute()
const router = useRouter()
const farmStore = useFarmStore()
const landPolygonDrawer = createLandPolygonDrawer()
const waterDvMarkerDrawer = createWaterDvMarkerDrawer()

const mapReady = ref(false)
const panelRef = ref(null)
const pageFrom = ref(String(route.query.from || 'home'))

let map = null
let farmInfoCache = null
let allDevices = []
let allLands = []
let selectLandId = null
let selectDeviceIds = []
let landChangeTimer = null

function onClose() {
  if (window.history.length > 1) router.back()
  else router.replace('/irrigation-group')
}

function syncPortCheckToDevices(portDeviceList) {
  if (!Array.isArray(portDeviceList)) return
  portDeviceList.forEach((portItem) => {
    const targetPileId = portItem.waterOutletPileId
    allDevices.forEach((device) => {
      const pile = device.specificData?.waterOutletPile
      if (!pile || pile.id !== targetPileId) return
      ;(pile.ports || []).forEach((port) => {
        const portInfo = (portItem.outletPorts || []).find(
          (p) => p.id === port.id
        )
        if (portInfo) port.isCheck = !!portInfo.isCheck
      })
    })
  })
}

function devicesForMapDraw() {
  return allDevices
    .filter((dev) => selectDeviceIds.includes(String(dev.id)))
    .map((dev) => {
      const copy = JSON.parse(JSON.stringify(dev))
      const ports = copy.specificData?.waterOutletPile?.ports || []
      ports.forEach((port) => {
        port.currentOpening = port.isCheck ? 100 : 0
      })
      return copy
    })
}

function updateMapByLandId() {
  if (!map || !selectLandId) return
  const currentLand = allLands.filter(
    (land) => String(land.id) === String(selectLandId)
  )
  const currentDevice = devicesForMapDraw()
  const layerOptions = [
    { value: 'land', isChose: true },
    { value: 'waterDv', isChose: true }
  ]
  landPolygonDrawer.drawLandPolygon(map, currentLand, {
    layerOptions,
    readOnly: true
  })
  waterDvMarkerDrawer.drawAllWaterDvMarker(map, currentDevice, {
    layerOptions
  })
  const overlays = [
    ...(landPolygonDrawer.landPolygonList || []),
    ...(waterDvMarkerDrawer.waterDvMarkers || [])
  ]
  if (overlays.length) {
    try {
      map.setFitView(overlays, false, [80, 80, 80, 420])
    } catch (e) {
      /* ignore */
    }
  }
}

function onChangeLand(landId, portDeviceList) {
  if (landChangeTimer) clearTimeout(landChangeTimer)
  landChangeTimer = setTimeout(() => {
    selectLandId = landId
    const ids = []
    ;(portDeviceList || []).forEach((item) => ids.push(String(item.id)))
    selectDeviceIds = ids
    syncPortCheckToDevices(portDeviceList)
    updateMapByLandId()
  }, 50)
}

async function bootstrap() {
  const farmId =
    farmStore.s_selectFarm?.id ??
    farmStore.selectFarm?.id ??
    null
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    return
  }
  try {
    const res = await getFarmInfo(farmId)
    if (res?.code !== 200 || !res.data) return
    farmInfoCache = res.data
    const prepared = prepareFarmMapResources(res.data)
    allLands = prepared.landList || []
    allDevices = (prepared.waterDvList || []).map((d) => {
      const device = { ...d }
      const pile = device.specificData?.waterOutletPile
      if (pile && Array.isArray(pile.ports)) {
        pile.ports.forEach((port) => {
          port.isCheck = false
        })
      }
      return device
    })
    initMap()
  } catch (e) {
    console.error('[MapEditGroup] 加载农场数据失败', e)
  }
}

async function onMapReady() {
  mapReady.value = true
  await nextTick()
  panelRef.value?.init?.()
}

function destroyMap() {
  if (landChangeTimer) {
    clearTimeout(landChangeTimer)
    landChangeTimer = null
  }
  landPolygonDrawer.destroy?.(map)
  waterDvMarkerDrawer.destroy?.(map)
  if (map) {
    try {
      map.destroy()
    } catch (e) {
      console.error('[MapEditGroup] 地图销毁异常', e)
    }
  }
  map = null
  mapReady.value = false
}

function initMap() {
  if (typeof window.AMap === 'undefined') {
    ElMessage.error('地图 SDK 未加载，请刷新重试')
    return
  }
  const centerLng =
    farmInfoCache?.longitude ??
    farmStore.selectFarm?.longitude ??
    116.397428
  const centerLat =
    farmInfoCache?.latitude ??
    farmStore.selectFarm?.latitude ??
    39.90923

  window.AMap.plugin(['AMap.GeometryUtil'], () => {
    const satelliteLayer = new window.AMap.TileLayer.Satellite({ opacity: 1 })
    map = new window.AMap.Map('edit-group-map', {
      zoom: 16,
      zooms: [3, 26],
      viewMode: '2D',
      layers: [satelliteLayer],
      resizeEnable: true,
      center: [Number(centerLng), Number(centerLat)]
    })
    map.on('complete', () => {
      onMapReady()
    })
  })
}

onMounted(() => {
  bootstrap()
})

onUnmounted(() => {
  destroyMap()
})
</script>

<style scoped>
.map-edit-group-page {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #e5e7eb;
}

.map-edit-group-page__map-wrap {
  position: absolute;
  inset: 0;
}

.map-edit-group-page__map {
  width: 100%;
  height: 100%;
}

.map-edit-group-page__loading {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #909399;
  font-size: 14px;
}
</style>
