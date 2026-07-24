<template>
  <div class="map-page">
    <FarmEmpty v-if="showFarmEmpty" />
    <template v-else-if="showMapContainer">
      <div id="map-container" class="map-container"></div>
      <div class="map-toolbar">
        <div class="map-zoom-controls">
          <button
            type="button"
            class="map-zoom-btn"
            title="放大"
            @click="handleZoomIn"
          >
            <span class="map-zoom-icon">+</span>
          </button>
          <button
            type="button"
            class="map-zoom-btn"
            title="缩小"
            @click="handleZoomOut"
          >
            <span class="map-zoom-icon">−</span>
          </button>
        </div>
        <div class="map-toolbar-divider" aria-hidden="true"></div>
        <button
          type="button"
          class="map-locate-btn"
          title="定位到当前位置"
          :disabled="isLocating"
          @click="handleLocate"
        >
          <svg
            class="map-locate-icon"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden="true"
          >
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

        <!-- 图层控制（对齐移动端 PopLayer；当前仅对接农场 Marker 显隐） -->
        <div
          class="map-layer-panel"
          :class="{ 'is-expanded': layerPanelExpanded }"
        >
          <button
            type="button"
            class="map-layer-trigger"
            title="图层"
            @click="toggleLayerPanel"
          >
            <i class="iconfont icon-map_ic_layer map-layer-trigger-icon"></i>
            <span class="map-layer-trigger-text">图层</span>
            <i
              v-if="!layerPanelExpanded"
              class="iconfont icon-xiala map-layer-trigger-arrow"
            ></i>
          </button>

          <div v-show="layerPanelExpanded" class="map-layer-list">
            <button
              v-for="item in layerOptions"
              :key="item.value"
              type="button"
              class="map-layer-item"
              :class="{ 'is-active': item.isChose, 'is-muted': !item.isChose }"
              :title="item.name"
              @click.stop="toggleLayerItem(item)"
            >
              <i class="iconfont map-layer-item-icon" :class="item.sIcon"></i>
              <span class="map-layer-item-text">{{ item.name }}</span>
            </button>
            <button
              type="button"
              class="map-layer-collapse"
              title="收起"
              @click.stop="layerPanelExpanded = false"
            >
              <i class="iconfont icon-xiala map-layer-collapse-arrow"></i>
            </button>
          </div>
        </div>
      </div>
      <div v-if="mapError" class="map-error">
        <el-empty :description="mapError" />
      </div>
      <LandEmptyDialog
        v-model="landEmptyVisible"
        @create="handleCreateLand"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useFarmStore } from '@/store/farm'
import { prepareFarmMapResources } from '@/utils/farmMapData'
import { createFarmMarkerDrawer } from '@/utils/farmMapMarker'
import { createLandPolygonDrawer } from '@/utils/farmMapLand'
import FarmEmpty from './FarmEmpty.vue'
import LandEmptyDialog from './LandEmptyDialog.vue'
import locatePinIcon from '@/assets/map/locate-pin.png'

/** 默认图层配置：进入地图全部勾选显示，不受缩放级别限制 */
const DEFAULT_LAYER_OPTIONS = [
  {
    value: 'waterDv',
    name: '出水桩',
    sIcon: 'icon-home_ic_foot_outlet_01',
    isChose: true
  },
  {
    value: 'group',
    name: '轮灌组',
    sIcon: 'icon-home_ic_foot_group_01',
    isChose: true
  },
  {
    value: 'land',
    name: '地块',
    sIcon: 'icon-map_ic_land',
    isChose: true
  },
  {
    value: 'farm',
    name: '农场',
    sIcon: 'icon-map_ic_farme',
    isChose: true
  },
  {
    value: 'camera',
    name: '摄像头',
    sIcon: 'icon-map_ic_sxt',
    isChose: true
  },
  {
    value: 'sensor',
    name: '传感器',
    sIcon: 'icon-map_ic_cgq',
    isChose: true
  },
  {
    value: 'fismart',
    name: '施肥机',
    sIcon: 'icon-map_ic_sfj',
    isChose: true
  }
]

const farmStore = useFarmStore()

/** 预留：农场 Marker 点击业务（弹窗、切换农场等） */
function logic_farmClick(farmItem) {
  console.log('[Map] logic_farmClick 预留出口', farmItem)
}

/** 预留：地块点击业务（弹窗、选中描边等） */
function logic_landClick(landItem, index) {
  console.log('[Map] logic_landClick 预留出口', landItem, index)
}

/** 农场 Marker 绘制器（对齐移动端 drawAllFarmMarker / createFarmMarker / clearFarmMark） */
const farmMarkerDrawer = createFarmMarkerDrawer({
  onFarmClick: logic_farmClick
})

/** 地块 Polygon 绘制器（对齐移动端 drawLandPolygon） */
const landPolygonDrawer = createLandPolygonDrawer({
  onLandClick: logic_landClick
})

/** ---- 地图引擎状态（本地，不进 Store） ---- */
const mapInstance = ref(null)
const mapError = ref('')
const mapReady = ref(false)
const mapInited = ref(false)
const mapLoading = ref(true)
const currentMapType = ref('satellite')
const isLocating = ref(false)
/** 当前位置 Marker（含经纬度标签） */
let nowMark = null

/** ---- 业务缓存（对齐移动端 map.vue 本地 data） ---- */
const farmList = ref([])
const farmInfo = ref(null)
const waterDvList = ref([])
const landList = ref([])
const landGroupList = ref([])
/** 图层勾选配置（默认全部显示；当前仅农场 Marker 已绘制并响应显隐） */
const layerOptions = ref(DEFAULT_LAYER_OPTIONS.map((item) => ({ ...item })))
const layerPanelExpanded = ref(false)
const selectedWaterDvIndex = ref(-1)
/** 当前农场无地块提示弹窗（对齐移动端 noLandPop / pop_polt_empty） */
const landEmptyVisible = ref(false)
/** full 接口尚未返回、但地图已就绪时的占位；或农场切换时的防抖序号 */
let fullInfoRequestId = 0
let offFarmChange = null

const showFarmEmpty = computed(
  () => !farmStore.isFarmLoading && farmStore.isFarmEmpty
)

const showMapContainer = computed(
  () => !farmStore.isFarmLoading && !farmStore.isFarmEmpty
)

const getMarkerDrawOptions = () => ({
  currentSelectFarmId: farmStore.selectFarm?.id,
  layerOptions: layerOptions.value
})

const attachFarmStatsToList = (prepared) => {
  if (!prepared?.farmInfo) return
  const currentFarm = farmList.value.find(
    (item) => item.id === prepared.farmInfo.id
  )
  if (!currentFarm) return
  currentFarm.totalAreaMu = prepared.farmInfo.totalAreaMu
  currentFarm.deviceCount = prepared.farmInfo.deviceCount
  if (prepared.farmInfo.longitude != null) {
    currentFarm.longitude = prepared.farmInfo.longitude
  }
  if (prepared.farmInfo.latitude != null) {
    currentFarm.latitude = prepared.farmInfo.latitude
  }
}

const drawAllFarmMarker = () => {
  if (!mapInstance.value || !mapInited.value) return
  farmMarkerDrawer.drawAllFarmMarker(
    mapInstance.value,
    farmList.value,
    getMarkerDrawOptions()
  )
}

const drawLandPolygon = () => {
  if (!mapInstance.value || !mapInited.value) return
  landPolygonDrawer.drawLandPolygon(mapInstance.value, landList.value, {
    layerOptions: layerOptions.value
  })
}

const refreshAllLayerVisible = () => {
  if (!mapInstance.value) return
  farmMarkerDrawer.refreshFarmLayerVisible(
    mapInstance.value,
    layerOptions.value,
    true
  )
  landPolygonDrawer.refreshLandLayerVisible(
    mapInstance.value,
    layerOptions.value,
    true
  )
}

const syncFarmListFromStore = () => {
  const list = farmStore.s_farm_list_all?.length
    ? farmStore.s_farm_list_all
    : farmStore.s_farm_list
  farmList.value = Array.isArray(list) ? list.map((item) => ({ ...item })) : []
}

const resetFarmMapResources = () => {
  farmInfo.value = null
  waterDvList.value = []
  landList.value = []
  landGroupList.value = []
  selectedWaterDvIndex.value = -1
  farmStore.setFarmInfo(null)
  landEmptyVisible.value = false
  landPolygonDrawer.clearAllLandPolygon(mapInstance.value)
}

/**
 * 将 full 接口数据加工为后续绘制可用的本地资源，并写入 Store.s_farm_info
 */
const applyFarmFullResources = (fullData) => {
  const prepared = prepareFarmMapResources(fullData)
  farmInfo.value = prepared.farmInfo
  waterDvList.value = prepared.waterDvList
  landList.value = prepared.landList
  landGroupList.value = prepared.landGroupList
  farmStore.setFarmInfo(prepared.farmInfo)
  attachFarmStatsToList(prepared)

  // 对齐移动端：lands 为空时弹出无地块提示
  if (prepared.hasNoLand) {
    landEmptyVisible.value = true
  } else {
    landEmptyVisible.value = false
  }

  return prepared
}

/** 预留：跳转新建地块（对齐移动端 toAddLand） */
const handleCreateLand = () => {
  console.log('[Map] 新建地块预留出口')
}

const clearUserLocationMark = () => {
  if (!nowMark) return
  try {
    if (mapInstance.value) {
      mapInstance.value.remove(nowMark)
    }
    const content = nowMark.getContent?.()
    content?.remove?.()
  } catch (e) {
    console.warn('[Map] 移除定位 Marker 失败', e)
  }
  nowMark = null
}

const destroyMap = () => {
  clearUserLocationMark()
  farmMarkerDrawer.destroy(mapInstance.value)
  landPolygonDrawer.destroy(mapInstance.value)
  if (mapInstance.value) {
    mapInstance.value.off('zoomchange', refreshAllLayerVisible)
    mapInstance.value.destroy()
    mapInstance.value = null
  }
  mapReady.value = false
  mapInited.value = false
  mapLoading.value = true
}

const centerMapByFarm = (farm) => {
  if (!farm || !mapInstance.value) return
  const { longitude, latitude } = farm
  if (longitude != null && latitude != null) {
    mapInstance.value.setZoomAndCenter(14, [longitude, latitude])
  }
}

const handleZoomIn = () => {
  if (!mapInstance.value) return
  mapInstance.value.zoomIn()
}

const handleZoomOut = () => {
  if (!mapInstance.value) return
  mapInstance.value.zoomOut()
}

const toggleLayerPanel = () => {
  layerPanelExpanded.value = !layerPanelExpanded.value
}

/** 切换图层勾选；农场仅勾选控制，地块还需 zoom>=13 */
const toggleLayerItem = (item) => {
  if (!item) return
  const idx = layerOptions.value.findIndex((v) => v.value === item.value)
  if (idx < 0) return

  // 替换数组项，确保 deep watch 可靠触发
  const next = {
    ...layerOptions.value[idx],
    isChose: !layerOptions.value[idx].isChose
  }
  layerOptions.value.splice(idx, 1, next)
}

/** 格式化经纬度展示，对齐图4：38.4872° N, 106.2309° E */
const formatLatLngLabel = (lat, lng) => {
  const latNum = Number(lat)
  const lngNum = Number(lng)
  const latAbs = Math.abs(latNum).toFixed(4)
  const lngAbs = Math.abs(lngNum).toFixed(4)
  const latDir = latNum >= 0 ? 'N' : 'S'
  const lngDir = lngNum >= 0 ? 'E' : 'W'
  return `${latAbs}° ${latDir}, ${lngAbs}° ${lngDir}`
}

/**
 * 绘制当前位置点：蓝色定位针 + 上方经纬度标签
 * 对齐移动端 drawUserPoint，PC 端额外展示经纬度文案
 */
const drawUserPoint = (lng, lat) => {
  if (!mapInstance.value || lng == null || lat == null) return

  mapInstance.value.setZoomAndCenter(17, [lng, lat])
  clearUserLocationMark()

  const labelText = formatLatLngLabel(lat, lng)
  const dom = document.createElement('div')
  dom.style.cssText =
    'display:flex;flex-direction:column;align-items:center;pointer-events:none;transform:translateY(0);'
  dom.innerHTML = `
    <div style="background:rgba(45,45,45,0.88);color:#fff;font-size:14px;line-height:1.2;padding:5px 10px;border-radius:4px;white-space:nowrap;margin-bottom:6px;box-shadow:0 2px 6px rgba(0,0,0,0.25);">
      ${labelText}
    </div>
    <img src="${locatePinIcon}" alt="" style="width:28px;height:36px;display:block;object-fit:contain;" />
  `

  nowMark = new window.AMap.Marker({
    position: [lng, lat],
    content: dom,
    anchor: 'bottom-center',
    offset: new window.AMap.Pixel(0, 0),
    zIndex: 20000,
    clickable: false
  })
  nowMark.setMap(mapInstance.value)
}

/** 点击定位：使用高德 Geolocation（浏览器定位，坐标转 GCJ-02） */
const handleLocate = () => {
  if (!mapInstance.value || !mapInited.value || isLocating.value) return

  if (typeof window.AMap === 'undefined') {
    ElMessage.error('地图 SDK 未加载')
    return
  }

  isLocating.value = true
  window.AMap.plugin('AMap.Geolocation', () => {
    const geo = new window.AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 12000,
      convert: true,
      showButton: false,
      showMarker: false,
      showCircle: false
    })

    geo.getCurrentPosition((status, result) => {
      isLocating.value = false
      if (status === 'complete' && result?.position) {
        const lng = result.position.lng ?? result.position.getLng?.()
        const lat = result.position.lat ?? result.position.getLat?.()
        if (lng != null && lat != null) {
          drawUserPoint(lng, lat)
          return
        }
      }
      console.warn('[Map] 定位失败', status, result)
      ElMessage.error('定位失败，请检查浏览器定位权限')
    })
  })
}

/**
 * 地图就绪后门控：拉取 full → 加工本地资源 → 定位
 * 对齐移动端：仅 mapInited 后才真正请求详情
 */
const getFarmInfoHttp = async (farmId) => {
  const id = farmId ?? farmStore.selectFarm?.id
  if (id == null) {
    resetFarmMapResources()
    return null
  }
  if (!mapInited.value || !mapInstance.value) return null

  const requestId = ++fullInfoRequestId
  try {
    const fullData = await farmStore.fetchFarmFullInfo(id)
    if (requestId !== fullInfoRequestId) return null

    const prepared = applyFarmFullResources(fullData)
    centerMapByFarm(prepared.farmInfo || farmStore.selectFarm)
    drawAllFarmMarker()
    drawLandPolygon()
    return prepared
  } catch (e) {
    if (requestId !== fullInfoRequestId) return null
    console.error('获取农场详情失败', e)
    resetFarmMapResources()
    centerMapByFarm(farmStore.selectFarm)
    return null
  }
}

const onMapComplete = () => {
  mapReady.value = true
  mapInited.value = true
  setTimeout(() => {
    mapLoading.value = false
  }, 200)

  syncFarmListFromStore()
  // 地图 complete 后绘制农场 Marker，并拉取 full 准备详情资源
  drawAllFarmMarker()
  getFarmInfoHttp()
}

const initMap = () => {
  if (typeof window.AMap === 'undefined') {
    mapError.value = '地图 SDK 未加载，请在 index.html 中配置高德地图 Key'
    return false
  }

  const container = document.getElementById('map-container')
  if (!container) {
    return false
  }

  try {
    // 原因：纯 Satellite 切片不含文字；showLabel/features 只作用于默认矢量底图。
    // 做法：卫星底图 + 默认矢量层叠在上层；features 不含 bg，避免盖住卫星，
    // 仅保留 point（行政区划/POI 标注），不加 RoadNet 彩色路网。
    const satelliteLayer = new window.AMap.TileLayer.Satellite({
      opacity: 1,
      zIndex: 1
    })
    const labelLayer =
      typeof window.AMap.createDefaultLayer === 'function'
        ? window.AMap.createDefaultLayer({
            zooms: [3, 20],
            opacity: 1,
            zIndex: 2,
            visible: true
          })
        : new window.AMap.TileLayer({
            zooms: [3, 20],
            opacity: 1,
            zIndex: 2,
            visible: true
          })

    mapInstance.value = new window.AMap.Map('map-container', {
      zoom: 14,
      zooms: [3, 20],
      center: [116.397428, 39.90923],
      viewMode: '2D',
      layers: [satelliteLayer, labelLayer],
      showLabel: true,
      features: ['point']
    })
    currentMapType.value = 'satellite'
    mapError.value = ''

    // 再设一次，确保矢量层不绘制不透明背景
    mapInstance.value.setFeatures(['point'])

    mapInstance.value.on('complete', onMapComplete)
    // 地块等图层：跟随缩放刷新显隐（zoom >= 13）
    mapInstance.value.on('zoomchange', refreshAllLayerVisible)
    return true
  } catch (e) {
    mapError.value = '地图初始化失败，请检查高德地图配置'
    console.error(e)
    return false
  }
}

const setupMap = async () => {
  if (farmStore.isFarmEmpty || farmStore.isFarmLoading) {
    if (farmStore.isFarmEmpty) {
      destroyMap()
      resetFarmMapResources()
      farmList.value = []
    }
    return
  }

  await nextTick()
  await nextTick()

  if (!document.getElementById('map-container')) return

  syncFarmListFromStore()

  if (!mapInstance.value) {
    mapLoading.value = true
    const mapReadyOk = initMap()
    if (!mapReadyOk) return
    // full 请求在 map complete 回调中触发
    return
  }

  // 地图已初始化：农场切换时刷新详情资源
  if (mapInited.value) {
    await getFarmInfoHttp()
  }
}

const handleFarmChange = async (payload) => {
  syncFarmListFromStore()

  if (farmStore.isFarmEmpty) {
    destroyMap()
    mapError.value = ''
    resetFarmMapResources()
    farmList.value = []
    return
  }
  if (farmStore.isFarmLoading) return

  // 对齐移动端：farmChange 若在地图完成前到达，只同步 farmList，等 complete 再绘制
  if (!mapInited.value) {
    if (!mapInstance.value) {
      await setupMap()
    }
    return
  }

  drawAllFarmMarker()
  await getFarmInfoHttp(payload?.selectFarm?.id)
}

onMounted(async () => {
  offFarmChange = farmStore.onFarmChange(handleFarmChange)

  if (!farmStore.isFarmLoading && !farmStore.isFarmEmpty) {
    await setupMap()
  }
})

watch(layerOptions, () => {
  refreshAllLayerVisible()
}, { deep: true })

watch(showMapContainer, (visible) => {
  if (!visible) {
    destroyMap()
    resetFarmMapResources()
  }
})

onUnmounted(() => {
  offFarmChange?.()
  destroyMap()
  resetFarmMapResources()
})

// 暴露给后续绘制/调试使用
defineExpose({
  mapInstance,
  mapInited,
  mapReady,
  farmList,
  farmInfo,
  waterDvList,
  landList,
  landGroupList,
  layerOptions,
  selectedWaterDvIndex,
  currentMapType,
  mapLoading,
  farmMarkerDrawer,
  landPolygonDrawer,
  drawAllFarmMarker,
  drawLandPolygon,
  logic_farmClick,
  logic_landClick,
  handleLocate,
  drawUserPoint
})
</script>

<style scoped>
.map-page {
  position: relative;
  height: calc(100vh - 60px);
  min-height: 500px;
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-toolbar {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.map-zoom-controls {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.map-zoom-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: #fff;
  cursor: pointer;
  color: #333;
  line-height: 1;
}

.map-zoom-btn + .map-zoom-btn {
  border-top: 1px solid #e8e8e8;
}

.map-zoom-btn:hover {
  background: #f5f5f5;
}

.map-zoom-btn:active {
  background: #ebebeb;
}

.map-zoom-icon {
  font-size: 22px;
  font-weight: 400;
  line-height: 1;
  user-select: none;
}

/* 放大缩小与定位之间的分隔线（对齐图2） */
.map-toolbar-divider {
  width: 20px;
  height: 1px;
  margin: 8px 0;
  background: rgba(255, 255, 255, 0.65);
  box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.2);
}

/* 定位按钮：白底方块与放大/缩小同宽；准星用 SVG，可独立控制大小 */
.map-locate-btn {
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
  line-height: 0;
}

.map-locate-btn:hover:not(:disabled) {
  background: #f5f5f5;
}

.map-locate-btn:active:not(:disabled) {
  background: #ebebeb;
}

.map-locate-btn:disabled {
  cursor: wait;
  opacity: 0.65;
}

.map-locate-icon {
  display: block;
  flex-shrink: 0;
}

/* 图层控制面板（定位按钮下方） */
.map-layer-panel {
  margin-top: 10px;
  width: 48px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.map-layer-trigger {
  width: 100%;
  padding: 8px 0 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.map-layer-trigger:hover {
  background: #f5f5f5;
}

.map-layer-trigger-icon {
  font-size: 18px;
  color: #666;
  line-height: 1;
}

.map-layer-trigger-text {
  font-size: 11px;
  color: #666;
  line-height: 1.2;
}

.map-layer-trigger-arrow {
  font-size: 10px;
  color: #999;
  line-height: 1;
}

.map-layer-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 0 2px;
  border-top: 1px solid #f0f0f0;
}

.map-layer-item {
  width: 100%;
  padding: 8px 0 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.map-layer-item:hover {
  background: #f7f7f7;
}

.map-layer-item-icon {
  font-size: 18px;
  line-height: 1;
  transition: color 0.15s;
}

.map-layer-item-text {
  font-size: 10px;
  line-height: 1.2;
  color: #666;
  white-space: nowrap;
}

/* 勾选：蓝色；取消勾选：置灰（对齐图2/图3） */
.map-layer-item.is-active .map-layer-item-icon {
  color: #3377ff;
}

.map-layer-item.is-active .map-layer-item-text {
  color: #3377ff;
}

.map-layer-item.is-muted .map-layer-item-icon {
  color: #c0c4cc;
}

.map-layer-item.is-muted .map-layer-item-text {
  color: #c0c4cc;
}

.map-layer-collapse {
  width: 100%;
  padding: 4px 0 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-layer-collapse:hover {
  background: #f5f5f5;
}

.map-layer-collapse-arrow {
  font-size: 12px;
  color: #999;
  line-height: 1;
}

.map-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  z-index: 1;
}
</style>
