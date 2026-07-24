<template>
  <div class="map-page">
    <FarmEmpty v-if="showFarmEmpty" />
    <template v-else-if="showMapContainer">
      <div id="map-container" class="map-container"></div>
      <div v-if="mapError" class="map-error">
        <el-empty :description="mapError" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useFarmStore } from '@/store/farm'
import { prepareFarmMapResources } from '@/utils/farmMapData'
import FarmEmpty from './FarmEmpty.vue'

const farmStore = useFarmStore()

/** ---- 地图引擎状态（本地，不进 Store） ---- */
const mapInstance = ref(null)
const mapError = ref('')
const mapReady = ref(false)
const mapInited = ref(false)
const mapLoading = ref(true)
const currentMapType = ref('satellite')

/** ---- 业务缓存（对齐移动端 map.vue 本地 data） ---- */
const farmList = ref([])
const farmInfo = ref(null)
const waterDvList = ref([])
const landList = ref([])
const landGroupList = ref([])
/** 图层勾选等 UI 配置，后续图层控制使用 */
const layerOptions = ref([])
const selectedWaterDvIndex = ref(-1)
/** full 接口尚未返回、但地图已就绪时的占位；或农场切换时的防抖序号 */
let fullInfoRequestId = 0
let offFarmChange = null

const showFarmEmpty = computed(
  () => !farmStore.isFarmLoading && farmStore.isFarmEmpty
)

const showMapContainer = computed(
  () => !farmStore.isFarmLoading && !farmStore.isFarmEmpty
)

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
}

/**
 * 将 full 接口数据加工为后续绘制可用的本地资源，并写入 Store.s_farm_info
 * 本阶段只准备数据，不绘制 Marker / Polygon
 */
const applyFarmFullResources = (fullData) => {
  const prepared = prepareFarmMapResources(fullData)
  farmInfo.value = prepared.farmInfo
  waterDvList.value = prepared.waterDvList
  landList.value = prepared.landList
  landGroupList.value = prepared.landGroupList
  farmStore.setFarmInfo(prepared.farmInfo)

  // 预留：无地块提示（后续可对接弹窗，与移动端 noLandPop 对齐）
  if (prepared.hasNoLand) {
    console.log('[Map] 当前农场暂无地块')
  }

  return prepared
}

const destroyMap = () => {
  if (mapInstance.value) {
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
  // 地图 complete 后首次拉取并准备农场详情资源（对齐 logic_mapComplete）
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
    const satelliteLayer = new window.AMap.TileLayer.Satellite({
      opacity: 1
    })
    const roadNetLayer = new window.AMap.TileLayer.RoadNet({
      opacity: 1
    })

    mapInstance.value = new window.AMap.Map('map-container', {
      zoom: 14,
      zooms: [3, 20],
      center: [116.397428, 39.90923],
      viewMode: '2D',
      layers: [satelliteLayer, roadNetLayer]
    })
    currentMapType.value = 'satellite'
    mapError.value = ''

    mapInstance.value.on('complete', onMapComplete)
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

  // 对齐移动端：farmChange 若在地图完成前到达，只同步 farmList，等 complete 再拉 full
  if (!mapInited.value) {
    if (!mapInstance.value) {
      await setupMap()
    }
    return
  }

  await getFarmInfoHttp(payload?.selectFarm?.id)
}

onMounted(async () => {
  offFarmChange = farmStore.onFarmChange(handleFarmChange)

  if (!farmStore.isFarmLoading && !farmStore.isFarmEmpty) {
    await setupMap()
  }
})

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

// 暴露给后续绘制/调试使用（本阶段仅准备数据，不绘制业务图形）
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
  mapLoading
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
