<template>
  <div class="map-page">
    <FarmEmpty v-if="showFarmEmpty" />
    <template v-else>
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
const loading = ref(true)
let offFarmChange = null

const showFarmEmpty = computed(() => !loading.value && farmStore.isFarmEmpty)

const initMap = () => {
  if (typeof window.AMap === 'undefined') {
    mapError.value = '地图 SDK 未加载，请在 index.html 中配置高德地图 Key'
    return false
  }

  try {
    mapInstance.value = new window.AMap.Map('map-container', {
      zoom: 12,
      center: [116.397428, 39.90923],
      viewMode: '2D'
    })
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

const handleFarmChange = (payload) => {
  centerMapByFarm(payload?.selectFarm)
}

const setupMap = async () => {
  if (farmStore.isFarmEmpty) return

  await nextTick()
  const mapReady = initMap()
  if (!mapReady) return

  centerMapByFarm(farmStore.selectFarm)
}

onMounted(async () => {
  offFarmChange = farmStore.onFarmChange(handleFarmChange)

  try {
    await farmStore.fetchFarmList()
    if (!farmStore.isFarmEmpty) {
      await setupMap()
    }
  } catch (e) {
    console.error('获取农场列表失败', e)
  } finally {
    loading.value = false
  }
})

watch(
  () => farmStore.selectFarm,
  (farm) => {
    centerMapByFarm(farm)
  }
)

onUnmounted(() => {
  offFarmChange?.()
  if (mapInstance.value) {
    mapInstance.value.destroy()
    mapInstance.value = null
  }
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
