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
import FarmEmpty from './FarmEmpty.vue'

const farmStore = useFarmStore()
const mapInstance = ref(null)
const mapError = ref('')
let offFarmChange = null
let fullInfoRequestId = 0

const showFarmEmpty = computed(
  () => !farmStore.isFarmLoading && farmStore.isFarmEmpty
)

const showMapContainer = computed(
  () => !farmStore.isFarmLoading && !farmStore.isFarmEmpty
)

const destroyMap = () => {
  if (mapInstance.value) {
    mapInstance.value.destroy()
    mapInstance.value = null
  }
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
    mapInstance.value = new window.AMap.Map('map-container', {
      zoom: 12,
      center: [116.397428, 39.90923],
      viewMode: '2D'
    })
    mapError.value = ''
    return true
  } catch (e) {
    mapError.value = '地图初始化失败，请检查高德地图配置'
    console.error(e)
    return false
  }
}

const centerMapByFarm = (farm) => {
  if (!farm || !mapInstance.value) return
  const { longitude, latitude } = farm
  if (longitude != null && latitude != null) {
    mapInstance.value.setCenter([longitude, latitude])
  }
}

const loadFarmFullAndCenter = async (farmId) => {
  const id = farmId ?? farmStore.selectFarm?.id
  if (id == null || !mapInstance.value) return

  const requestId = ++fullInfoRequestId
  try {
    const farmInfo = await farmStore.fetchFarmFullInfo(id)
    if (requestId !== fullInfoRequestId) return
    centerMapByFarm(farmInfo)
  } catch (e) {
    if (requestId !== fullInfoRequestId) return
    console.error('获取农场详情失败', e)
    centerMapByFarm(farmStore.selectFarm)
  }
}

const setupMap = async (farmId) => {
  if (farmStore.isFarmEmpty || farmStore.isFarmLoading) {
    if (farmStore.isFarmEmpty) destroyMap()
    return
  }

  await nextTick()
  await nextTick()

  if (!document.getElementById('map-container')) return

  if (!mapInstance.value) {
    const mapReady = initMap()
    if (!mapReady) return
  }

  await loadFarmFullAndCenter(farmId)
}

const handleFarmChange = async (payload) => {
  if (farmStore.isFarmEmpty) {
    destroyMap()
    mapError.value = ''
    farmStore.fetchFarmFullInfo(null)
    return
  }
  if (farmStore.isFarmLoading) return
  await setupMap(payload?.selectFarm?.id)
}

onMounted(async () => {
  offFarmChange = farmStore.onFarmChange(handleFarmChange)

  // 布局壳已拉完农场数据时，仅在此处初始化一次
  if (!farmStore.isFarmLoading && !farmStore.isFarmEmpty) {
    await setupMap()
  }
})

watch(showMapContainer, (visible) => {
  if (!visible) {
    destroyMap()
  }
})

onUnmounted(() => {
  offFarmChange?.()
  destroyMap()
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
