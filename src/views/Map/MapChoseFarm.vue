<template>
  <div class="chose-farm-page">
    <!-- 顶部白色模块：标题 + 搜索 + 返回 -->
    <div class="chose-farm-top">
      <h2 class="chose-farm-top__title">{{ pageTitle }}</h2>
      <div class="chose-farm-top__row">
        <div class="chose-farm-search">
          <div class="chose-farm-search__input-wrap">
            <input
              v-model="searchKey"
              class="chose-farm-search__input"
              type="text"
              placeholder="在地图上标记您的农业资产核心位置..."
              @input="handleSearchInput"
              @focus="onSearchFocus"
              @blur="onSearchBlur"
            />
            <button
              v-if="searchKey"
              type="button"
              class="chose-farm-search__clear"
              @click="clearSearch"
            >
              ✕
            </button>
            <i class="iconfont icon-farm_ic_search chose-farm-search__icon"></i>
          </div>
          <div
            v-if="showSearchList && searchList.length"
            class="chose-farm-search__result"
          >
            <button
              v-for="(item, index) in searchList"
              :key="index"
              type="button"
              class="chose-farm-search__item"
              @mousedown.prevent="onSelectSearchItem(item)"
            >
              <div class="chose-farm-search__name">{{ item.name }}</div>
              <div class="chose-farm-search__address">{{ item.address }}</div>
            </button>
          </div>
        </div>
        <button type="button" class="chose-farm-back" @click="onBack">
          <span class="chose-farm-back__arrow">←</span>
          返回
        </button>
      </div>
    </div>

    <!-- 地图区域 -->
    <div class="chose-farm-map-wrap">
      <div v-if="!isLocationNowOk" class="chose-farm-locating">
        <p>正在获取当前位置...</p>
      </div>

      <div id="farm-chose-map" class="chose-farm-map"></div>

      <div class="chose-farm-center-marker" aria-hidden="true">
        <img
          class="chose-farm-center-marker__img"
          :class="{ 'is-dragging': isDragging }"
          :src="centerMarkerImg"
          alt=""
        />
      </div>

      <div class="chose-farm-map-tools">
        <button
          type="button"
          class="chose-farm-map-tools__btn"
          title="放大"
          @click="handleZoomIn"
        >
          +
        </button>
        <button
          type="button"
          class="chose-farm-map-tools__btn"
          title="缩小"
          @click="handleZoomOut"
        >
          −
        </button>
        <button
          type="button"
          class="chose-farm-map-tools__btn chose-farm-map-tools__locate"
          title="回到当前位置"
          @click="getLocation"
        >
          <svg
            class="chose-farm-map-tools__locate-icon"
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
      </div>
    </div>

    <!-- 底部确认栏（逆地理编码后展示） -->
    <div v-if="confirmVisible" class="chose-farm-confirm">
      <div class="chose-farm-confirm__info">
        <p class="chose-farm-confirm__address">{{ confirmAddress }}</p>
        <p class="chose-farm-confirm__tip">
          <i class="iconfont icon-device_ic_add_gantanhao chose-farm-confirm__tip-icon"></i>
          选中位置将作为农场默认中心点
        </p>
      </div>
      <div class="chose-farm-confirm__actions">
        <button
          type="button"
          class="chose-farm-confirm__cancel"
          @click="onCancelConfirm"
        >
          取消
        </button>
        <button
          type="button"
          class="chose-farm-confirm__ok"
          @click="onConfirmAddress"
        >
          确定定位
        </button>
      </div>
    </div>

    <!-- 保存农场信息弹框（对齐 AddFarm 业务，PC 交互改为弹层） -->
    <div
      v-if="saveDialogVisible"
      class="chose-farm-save-mask"
      @click.self="onCloseSaveDialog"
    >
      <div class="chose-farm-save-dialog" @click.stop>
        <h3 class="chose-farm-save-dialog__title">保存农场信息</h3>

        <div class="chose-farm-save-dialog__field">
          <label class="chose-farm-save-dialog__label">
            农场名称<span class="is-required">*</span>
          </label>
          <input
            v-model="farmName"
            class="chose-farm-save-dialog__input"
            type="text"
            placeholder="例如：银川兴庆区智慧示范园"
            maxlength="50"
            required
            @input="farmNameError = ''"
          />
          <p v-if="farmNameError" class="chose-farm-save-dialog__error">
            {{ farmNameError }}
          </p>
        </div>

        <div class="chose-farm-save-dialog__field">
          <label class="chose-farm-save-dialog__label">农场位置信息</label>
          <div class="chose-farm-save-dialog__location">
            <i class="iconfont icon-map_ic_land chose-farm-save-dialog__loc-icon"></i>
            <div class="chose-farm-save-dialog__loc-text">
              <p class="chose-farm-save-dialog__loc-address">
                {{ confirmAddress || '未知地址' }}
              </p>
              <p class="chose-farm-save-dialog__loc-coord">
                {{ locationCoordText }}
              </p>
            </div>
          </div>
        </div>

        <div class="chose-farm-save-dialog__footer">
          <button
            type="button"
            class="chose-farm-save-dialog__cancel"
            :disabled="saving"
            @click="onCloseSaveDialog"
          >
            取消
          </button>
          <button
            type="button"
            class="chose-farm-save-dialog__ok"
            :disabled="saving || !farmName.trim()"
            @click="onSaveFarm"
          >
            {{ saving ? '保存中...' : '保存' }}
          </button>
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
import { useUserStore } from '@/store/user'
import { addFarm } from '@/api/map'
import centerMarkerImg from '@/assets/map/location-farm-chose.png'

const route = useRoute()
const router = useRouter()
const farmStore = useFarmStore()
const userStore = useUserStore()

const pageType = computed(() =>
  route.query.type === 'edit' ? 'edit' : 'add'
)
const pageTitle = computed(() =>
  pageType.value === 'add' ? '新建农场 - 选择位置' : '编辑农场 - 选择位置'
)

const isLocationNowOk = ref(false)
const isDragging = ref(false)
const searchKey = ref('')
const searchList = ref([])
const showSearchList = ref(false)
const searchTimer = ref(null)
const debounceDelay = 300

const confirmVisible = ref(false)
const confirmAddress = ref('')
const confirmLng = ref(null)
const confirmLat = ref(null)

/** 保存农场信息弹框 */
const saveDialogVisible = ref(false)
const farmName = ref('')
const farmNameError = ref('')
const saving = ref(false)

const locationCoordText = computed(() => {
  const lat = Number(confirmLat.value)
  const lng = Number(confirmLng.value)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '--'
  const latHem = lat >= 0 ? 'N' : 'S'
  const lngHem = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(4)}° ${latHem}, ${Math.abs(lng).toFixed(4)}° ${lngHem}`
})

const resolveUserId = () => {
  const fromStore = userStore.userInfo?.id ?? userStore.userInfo?.userId
  if (fromStore != null && fromStore !== '') return fromStore
  try {
    const raw = localStorage.getItem('userInfo')
    if (!raw) return 0
    const info = JSON.parse(raw)
    return info?.id ?? info?.userId ?? 0
  } catch {
    return 0
  }
}

let map = null
let nowMark = null
let geocoder = null
let placeSearch = null
const LOCATION_NOW_ICON =
  'https://cdzp-oss.farm-net.cn/app/uniapp/water_helper/location_now.png'

const onBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/map')
  }
}

const clearSearch = () => {
  searchKey.value = ''
  searchList.value = []
  showSearchList.value = false
}

const handleZoomIn = () => {
  map?.zoomIn?.()
}

const handleZoomOut = () => {
  map?.zoomOut?.()
}

const loadPluginsAndCreateMap = () => {
  window.AMap.plugin(
    ['AMap.Geolocation', 'AMap.Geocoder', 'AMap.PlaceSearch'],
    () => {
      geocoder = new window.AMap.Geocoder({
        radius: 1000,
        extensions: 'base'
      })
      placeSearch = new window.AMap.PlaceSearch({
        pageSize: 20,
        pageIndex: 1,
        city: '全国',
        type: '',
        citylimit: false,
        extensions: 'base'
      })
      createMap()
    }
  )
}

const createMap = () => {
  const container = document.getElementById('farm-chose-map')
  if (!container || typeof window.AMap === 'undefined') return

  map = new window.AMap.Map('farm-chose-map', {
    zoom: 18,
    zooms: [3, 26],
    center: [116.397428, 39.90923],
    viewMode: '2D',
    layers: [new window.AMap.TileLayer.Satellite()],
    resizeEnable: true
  })

  map.on('complete', () => {
    map.on('dragstart', () => {
      isDragging.value = true
    })
    map.on('dragend', () => {
      isDragging.value = false
      getCenterLocation()
    })
    getLocation()
  })
}

const destroyMap = () => {
  if (nowMark && map) {
    try {
      map.remove(nowMark)
    } catch (e) {
      /* ignore */
    }
    nowMark = null
  }
  if (map) {
    try {
      map.clearMap()
      map.destroy()
    } catch (e) {
      console.error('[MapChoseFarm] 地图销毁异常', e)
    }
  }
  map = null
  geocoder = null
  placeSearch = null
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
        if (lng != null && lat != null) {
          drawPoint(lng, lat)
          return
        }
      }
      ElMessage.warning('定位失败，请手动拖动地图选择')
      isLocationNowOk.value = true
    })
  })
}

const drawPoint = (lng, lat) => {
  if (!lng || !lat || !map || !geocoder) return

  try {
    map.setCenter([lng, lat - 0.0008])
    map.setZoom(17)
  } catch (e) {
    /* ignore */
  }

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

  geocoder.getAddress([lng, lat], (status, result) => {
    isLocationNowOk.value = true
    if (status === 'complete' && result.info === 'OK') {
      void result.regeocode
    }
  })
}

const openConfirm = (lng, lat, address) => {
  confirmLng.value = lng
  confirmLat.value = lat
  confirmAddress.value = address
  confirmVisible.value = true
}

const closeConfirm = () => {
  confirmVisible.value = false
}

/** 取消：关闭确认栏，地图重新定位到当前位置 */
const onCancelConfirm = () => {
  closeConfirm()
  getLocation()
}

watch(confirmVisible, async () => {
  await nextTick()
  try {
    map?.resize?.()
  } catch (e) {
    /* ignore */
  }
})

const getCenterLocation = () => {
  if (!map || !geocoder) return
  const center = map.getCenter()
  const lng = center.lng
  const lat = center.lat

  geocoder.getAddress([lng, lat], (status, result) => {
    if (status === 'complete' && result.info === 'OK') {
      const addr = result.regeocode
      openConfirm(lng, lat, addr.formattedAddress || '未知地址')
    } else {
      openConfirm(lng, lat, '地址解析失败，请手动确认')
    }
  })
}

const onConfirmAddress = () => {
  const lng = confirmLng.value
  const lat = confirmLat.value
  const address = confirmAddress.value
  if (lng == null || lat == null) return

  farmStore.setLocation({ lng, lat, address })

  if (pageType.value === 'add') {
    farmName.value = ''
    farmNameError.value = ''
    saveDialogVisible.value = true
    return
  }

  // 对齐移动端 farmEditMsg / locationChange：回填缓冲供 EditFarm 消费
  farmStore.setPendingFarmLocation({ lng, lat, address })
  ElMessage.success('位置已更新')
  setTimeout(() => {
    router.back()
  }, 300)
}

const onCloseSaveDialog = () => {
  if (saving.value) return
  saveDialogVisible.value = false
}

/** 保存新建农场（对齐 AddFarm.vue / POST /api/farm） */
const onSaveFarm = async () => {
  const name = farmName.value.trim()
  if (!name) {
    farmNameError.value = '请输入农场名称'
    ElMessage.warning('请输入农场名称')
    return
  }
  farmNameError.value = ''
  const lng = confirmLng.value
  const lat = confirmLat.value
  const address = confirmAddress.value
  if (lng == null || lat == null) {
    ElMessage.warning('请重新选择农场地址')
    return
  }

  saving.value = true
  try {
    const res = await addFarm({
      userId: resolveUserId(),
      name,
      address,
      longitude: lng,
      latitude: lat
    })
    if (res?.code === 200) {
      saveDialogVisible.value = false
      ElMessage.success('操作成功,即将返回首页')
      setTimeout(async () => {
        try {
          await farmStore.fetchFarmList()
        } catch (e) {
          console.error('[MapChoseFarm] 刷新农场列表失败', e)
        }
        router.replace('/map')
      }, 1500)
    }
  } catch (e) {
    console.error('[MapChoseFarm] 新建农场失败', e)
  } finally {
    saving.value = false
  }
}

const handleSearchInput = () => {
  const key = searchKey.value.trim()
  clearTimeout(searchTimer.value)
  if (!key) {
    searchList.value = []
    showSearchList.value = false
    return
  }
  searchTimer.value = setTimeout(() => {
    searchAddress(key)
  }, debounceDelay)
}

const searchAddress = (keyword) => {
  if (!placeSearch || !keyword) return
  placeSearch.search(keyword, (status, result) => {
    if (status === 'complete' && result.poiList?.pois) {
      searchList.value = result.poiList.pois.map((poi) => ({
        ...poi,
        location: {
          lng: poi.location.lng,
          lat: poi.location.lat
        }
      }))
      showSearchList.value = searchList.value.length > 0
      return
    }
    if (keyword.length <= 2) {
      placeSearch.search(`${keyword} 农场`, (status2, result2) => {
        if (status2 === 'complete' && result2.poiList?.pois) {
          searchList.value = result2.poiList.pois.map((poi) => ({
            ...poi,
            location: {
              lng: poi.location.lng,
              lat: poi.location.lat
            }
          }))
          showSearchList.value = searchList.value.length > 0
        } else {
          searchList.value = []
          showSearchList.value = false
        }
      })
    } else {
      searchList.value = []
      showSearchList.value = false
    }
  })
}

const onSelectSearchItem = (item) => {
  showSearchList.value = false
  searchKey.value = item.name || item.address || ''
  const lng = item.location?.lng
  const lat = item.location?.lat
  if (!lng || !lat) {
    ElMessage.warning('坐标获取失败')
    return
  }
  moveToCenter(lng, lat)
}

const moveToCenter = (lng, lat) => {
  if (!map || !lng || !lat) return
  map.setCenter([lng, lat - 0.0008])
  map.setZoom(17)
  setTimeout(() => {
    getCenterLocation()
  }, 1000)
}

const onSearchFocus = () => {
  if (searchList.value.length) showSearchList.value = true
}

const onSearchBlur = () => {
  setTimeout(() => {
    showSearchList.value = false
  }, 200)
}

const initMap = () => {
  if (typeof window.AMap === 'undefined') {
    ElMessage.error('地图 SDK 未加载，请刷新重试')
    return
  }
  loadPluginsAndCreateMap()
}

onMounted(async () => {
  await nextTick()
  initMap()
})

onUnmounted(() => {
  clearTimeout(searchTimer.value)
  destroyMap()
})
</script>

<style scoped>
.chose-farm-page {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fa;
}

/* ========== 顶部白色模块 ========== */

.chose-farm-top {
  flex-shrink: 0;
  padding: 20px 24px 16px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 20;
}

.chose-farm-top__title {
  margin: 0 0 16px;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 20px;
  font-weight: bold;
  color: #0f172a;
  line-height: 1.4;
}

.chose-farm-top__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.chose-farm-search {
  position: relative;
  width: 330px;
  flex-shrink: 0;
}

.chose-farm-search__input-wrap {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  background: #fff;
  box-sizing: border-box;
}

.chose-farm-search__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  font-size: 14px;
  color: #303133;
  background: transparent;
}

.chose-farm-search__input::placeholder {
  color: #c0c4cc;
}

.chose-farm-search__clear {
  width: 24px;
  height: 24px;
  margin-right: 4px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #909399;
  cursor: pointer;
  font-size: 14px;
  flex-shrink: 0;
}

.chose-farm-search__icon {
  flex-shrink: 0;
  font-size: 18px;
  color: #909399;
}

.chose-farm-search__result {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 280px;
  overflow-y: auto;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 30;
}

.chose-farm-search__item {
  width: 100%;
  border: none;
  border-bottom: 1px solid #f5f5f5;
  background: #fff;
  text-align: left;
  padding: 12px 16px;
  cursor: pointer;
}

.chose-farm-search__item:last-child {
  border-bottom: none;
}

.chose-farm-search__item:hover {
  background: #f7fafc;
}

.chose-farm-search__name {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.chose-farm-search__address {
  font-size: 12px;
  color: #909399;
}

.chose-farm-back {
  flex-shrink: 0;
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

.chose-farm-back__arrow {
  font-size: 16px;
  line-height: 1;
}

.chose-farm-back:hover {
  border-color: #3653a0;
  color: #3653a0;
}

/* ========== 地图区域 ========== */

.chose-farm-map-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.chose-farm-map {
  width: 100%;
  height: 100%;
}

.chose-farm-locating {
  position: absolute;
  inset: 0;
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #666;
  font-size: 15px;
}

.chose-farm-center-marker {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -100%);
  z-index: 15;
  pointer-events: none;
}

.chose-farm-center-marker__img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  transition: transform 0.2s ease;
  display: block;
}

.chose-farm-center-marker__img.is-dragging {
  transform: scale(1.3);
}

.chose-farm-map-tools {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chose-farm-map-tools__btn {
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
  font-weight: 400;
  color: #333;
  line-height: 1;
}

.chose-farm-map-tools__btn:hover {
  background: #f5f5f5;
}

.chose-farm-map-tools__btn:active {
  background: #ebebeb;
}

.chose-farm-map-tools__locate {
  line-height: 0;
}

.chose-farm-map-tools__locate-icon {
  display: block;
  flex-shrink: 0;
}

/* ========== 底部确认栏 ========== */

.chose-farm-confirm {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 24px;
  background: #fff;
  border-top: 1px solid #edf1f7;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
}

.chose-farm-confirm__info {
  flex: 1;
  min-width: 0;
}

.chose-farm-confirm__address {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
  word-break: break-all;
}

.chose-farm-confirm__tip {
  margin: 8px 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.chose-farm-confirm__tip-icon {
  font-size: 14px;
  color: #c0c4cc;
  flex-shrink: 0;
}

.chose-farm-confirm__actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.chose-farm-confirm__cancel {
  height: 40px;
  padding: 0 22px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  color: #606266;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.chose-farm-confirm__cancel:hover {
  border-color: #3653a0;
  color: #3653a0;
}

.chose-farm-confirm__ok {
  height: 40px;
  padding: 0 22px;
  border: none;
  border-radius: 8px;
  background: #3653a0;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.chose-farm-confirm__ok:hover {
  background: #2f4a90;
}

/* ========== 保存农场信息弹框 ========== */

.chose-farm-save-mask {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}

.chose-farm-save-dialog {
  width: 480px;
  max-width: 100%;
  padding: 28px 28px 24px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.18);
  box-sizing: border-box;
}

.chose-farm-save-dialog__title {
  margin: 0 0 24px;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  color: #0f172a;
  line-height: 1.4;
}

.chose-farm-save-dialog__field + .chose-farm-save-dialog__field {
  margin-top: 20px;
}

.chose-farm-save-dialog__label {
  display: block;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.chose-farm-save-dialog__label .is-required {
  margin-left: 2px;
  color: #f56c6c;
}

.chose-farm-save-dialog__input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: none;
  border-radius: 10px;
  background: #f5f7fa;
  font-size: 14px;
  color: #0f172a;
  outline: none;
  box-sizing: border-box;
}

.chose-farm-save-dialog__input::placeholder {
  color: #c0c4cc;
}

.chose-farm-save-dialog__error {
  margin: 8px 0 0;
  font-size: 12px;
  color: #f56c6c;
  line-height: 1.4;
}

.chose-farm-save-dialog__location {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  background: #f5f7fa;
  box-sizing: border-box;
}

.chose-farm-save-dialog__loc-icon {
  margin-top: 2px;
  font-size: 16px;
  color: #3653a0;
  flex-shrink: 0;
}

.chose-farm-save-dialog__loc-text {
  flex: 1;
  min-width: 0;
}

.chose-farm-save-dialog__loc-address {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.5;
  word-break: break-all;
}

.chose-farm-save-dialog__loc-coord {
  margin: 6px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.chose-farm-save-dialog__footer {
  margin-top: 28px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.chose-farm-save-dialog__cancel {
  height: 40px;
  padding: 0 22px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #606266;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.chose-farm-save-dialog__cancel:hover:not(:disabled) {
  color: #3653a0;
}

.chose-farm-save-dialog__ok {
  height: 40px;
  padding: 0 28px;
  border: none;
  border-radius: 8px;
  background: #3653a0;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.chose-farm-save-dialog__ok:hover:not(:disabled) {
  background: #2f4a90;
}

.chose-farm-save-dialog__cancel:disabled,
.chose-farm-save-dialog__ok:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
