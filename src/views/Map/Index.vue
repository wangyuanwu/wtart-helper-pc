<template>
  <div class="map-page">
    <div id="map-container" class="map-container"></div>
    <div v-if="mapError" class="map-error">
      <el-empty :description="mapError" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const mapInstance = ref(null)
const mapError = ref('')

onMounted(() => {
  if (typeof window.AMap === 'undefined') {
    mapError.value = '地图 SDK 未加载，请在 index.html 中配置高德地图 Key'
    return
  }

  try {
    mapInstance.value = new window.AMap.Map('map-container', {
      zoom: 12,
      center: [116.397428, 39.90923],
      viewMode: '2D'
    })
  } catch (e) {
    mapError.value = '地图初始化失败，请检查高德地图配置'
    console.error(e)
  }
})

onUnmounted(() => {
  if (mapInstance.value) {
    mapInstance.value.destroy()
    mapInstance.value = null
  }
})
</script>

<style scoped>
.map-page {
  position: relative;
  height: calc(100vh - 120px);
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
}
</style>
