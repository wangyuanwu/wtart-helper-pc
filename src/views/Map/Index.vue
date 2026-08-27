<template>
  <div class="map-page">
    <template v-if="showMapContainer">
      <div id="map-container" class="map-container"></div>
      <!-- 对齐移动端 customLogo：隐藏高德标志，展示能手地图 -->
      <div class="map-brand-logo" aria-hidden="true">
        <img
          class="map-brand-logo__img"
          src="https://cdzp-oss.farm-net.cn/app/uniapp/water_helper/logo.png"
          alt=""
        />
        <span class="map-brand-logo__text">能手地图</span>
      </div>
      <!-- 对齐移动端 mapLoading 遮罩 -->
      <div v-if="mapLoading" class="map-loading-mask">
        <span class="map-loading-mask__text">正在加载地图...</span>
      </div>
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
            <el-icon
              v-if="!layerPanelExpanded"
              class="map-layer-trigger-arrow"
            >
              <ArrowDown />
            </el-icon>
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
              <el-icon class="map-layer-collapse-arrow">
                <ArrowUp />
              </el-icon>
            </button>
          </div>
        </div>

        <!-- 统计工具栏（对齐移动端 showStatistics → farm_data） -->
        <button
          type="button"
          class="map-stats-btn"
          title="灌溉统计"
          @click="openIrrStats"
        >
          <i class="iconfont icon-ic_map_tongji map-stats-btn__icon"></i>
          <span class="map-stats-btn__text">统计</span>
        </button>
      </div>
      <div v-if="mapError" class="map-error">
        <el-empty :description="mapError" />
      </div>
      <LandEmptyDialog
        v-model="landEmptyVisible"
        @create="handleCreateLand"
        @close="onLandEmptyClose"
      />
      <FarmIrrStatsDrawer v-model="irrStatsVisible" />
      <WaterDvPopup
        ref="waterDvPopupRef"
        v-model="waterDvPopupVisible"
        :device="activeWaterDv"
        @close="onWaterDvPopupClose"
      />
      <FarmPopup
        v-model="farmPopupVisible"
        :farm="clickedFarm"
        :farm-detail="clickedFarmDetail"
        :is-current-farm="isClickedCurrentFarm"
        :loading="farmPopupLoading"
        @close="onFarmPopupClose"
        @enter="onEnterClickedFarm"
      />
      <LandPopup
        v-model="landPopupVisible"
        :land="clickedLand"
        :farm-info="farmInfo"
        @close="onLandPopupClose"
        @edit="onEditLand"
      />
      <LandEditPopup
        v-model="landEditPopupVisible"
        :land-edit="editingLand"
        @close="onLandEditClose"
        @back="onLandEditBack"
        @delete="onLandEditDelete"
        @save="onLandEditSave"
        @edit-area="onLandEditArea"
      />
      <LandGroupPopup
        v-model="landGroupPopupVisible"
        :group="clickedLandGroup"
        @close="onLandGroupPopupClose"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import { useFarmStore } from '@/store/farm'
import { parseAreaJson, prepareFarmMapResources, formatAreaMu } from '@/utils/farmMapData'
import { createFarmMarkerDrawer } from '@/utils/farmMapMarker'
import { createLandPolygonDrawer } from '@/utils/farmMapLand'
import { createLandGroupPolygonDrawer } from '@/utils/farmMapLandGroup'
import { createWaterDvMarkerDrawer } from '@/utils/farmMapWaterDv'
import LandEmptyDialog from './LandEmptyDialog.vue'
import FarmIrrStatsDrawer from './FarmIrrStatsDrawer.vue'
import WaterDvPopup from './WaterDvPopup.vue'
import FarmPopup from './FarmPopup.vue'
import LandPopup from './LandPopup.vue'
import LandEditPopup from './LandEditPopup.vue'
import LandGroupPopup from './LandGroupPopup.vue'
import locatePinIcon from '@/assets/map/locate-pin.png'
import { px2rem } from '@/utils/rem'
import { getFarmWaterOutletStatus } from '@/api/device'
import { getGroupList } from '@/api/irrigationGroup'
import { deleteLand, getFarmInfo, updateLand } from '@/api/map'

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

/** 用缓存合并默认图层（对齐移动端 initLayer / vuex_layer） */
function resolveLayerOptions(cached) {
  const defaults = DEFAULT_LAYER_OPTIONS.map((item) => ({ ...item }))
  if (!Array.isArray(cached) || !cached.length) return defaults
  return defaults.map((def) => {
    const hit = cached.find((c) => c.value === def.value)
    return hit ? { ...def, isChose: !!hit.isChose } : def
  })
}

const farmStore = useFarmStore()
const router = useRouter()

const selectedWaterDvIndex = ref(-1)
/** 出水桩弹窗（对齐移动端 pop_device_control） */
const waterDvPopupVisible = ref(false)
const activeWaterDv = ref(null)
const waterDvPopupRef = ref(null)

/** 农场点击弹窗（左上角详情卡） */
const farmPopupVisible = ref(false)
const farmPopupLoading = ref(false)
const clickedFarm = ref(null)
const clickedFarmDetail = ref(null)
let farmClickRequestId = 0

/** 地块点击弹窗（对齐移动端 pop_land_info） */
const landPopupVisible = ref(false)
const clickedLand = ref(null)
const landEditPopupVisible = ref(false)
const editingLand = ref(null)
const landGroupPopupVisible = ref(false)
const clickedLandGroup = ref(null)

const isClickedCurrentFarm = computed(() => {
  const currentId = farmStore.selectFarm?.id
  const clickId = clickedFarm.value?.id
  if (currentId == null || clickId == null) return false
  return String(currentId) === String(clickId)
})

/** 农场出水桩状态轮询（对齐移动端 status-by-farm，3s） */
const FARM_DEVICE_STATUS_POLL_MS = 3000
let farmDeviceStatusTimer = null
let farmDeviceStatusRequestId = 0

/** 农场轮灌组状态轮询（对齐移动端 getGroupList，15s） */
const FARM_GROUP_STATUS_POLL_MS = 15000
let farmGroupStatusTimer = null
let farmGroupStatusRequestId = 0

/** 农场 Marker 点击：轻量卡 + 左上角详情弹窗 */
async function logic_farmClick(farmItem) {
  console.log('[Map] logic_farmClick', farmItem)
  if (!farmItem?.id) return

  // 关闭出水桩/地块弹窗，保留农场轻量卡由 marker 侧展示
  waterDvPopupVisible.value = false
  activeWaterDv.value = null
  selectedWaterDvIndex.value = -1
  waterDvMarkerDrawer.resetAllWaterDvMarkers()
  landPopupVisible.value = false
  clickedLand.value = null
  landEditPopupVisible.value = false
  editingLand.value = null
  landGroupPopupVisible.value = false
  clickedLandGroup.value = null
  landPolygonDrawer.resetAllLandBorder()
  landGroupPolygonDrawer.resetAllLandGroupBorder()

  clickedFarm.value = farmItem
  clickedFarmDetail.value = null
  farmPopupVisible.value = true
  farmPopupLoading.value = true

  const isCurrent =
    farmStore.selectFarm?.id != null &&
    String(farmStore.selectFarm.id) === String(farmItem.id)

  farmMarkerDrawer.updateFarmInfoCard(farmItem.id, {
    title: isCurrent ? '当前农场' : farmItem.name || '未知农场',
    totalAreaMu: farmItem.totalAreaMu || '0.00',
    deviceCount: farmItem.deviceCount ?? 0,
    visible: true
  })

  const requestId = ++farmClickRequestId
  try {
    // 仅用于弹窗展示，不覆盖当前地图农场的 store.s_farm_info
    const res = await getFarmInfo(farmItem.id)
    if (requestId !== farmClickRequestId) return
    const fullData = res?.data || null
    if (!fullData) {
      farmPopupLoading.value = false
      return
    }

    const prepared = prepareFarmMapResources(fullData)
    clickedFarmDetail.value = prepared.farmInfo

    farmMarkerDrawer.updateFarmInfoCard(farmItem.id, {
      title: isCurrent ? '当前农场' : prepared.farmInfo?.name || farmItem.name,
      totalAreaMu: prepared.farmInfo?.totalAreaMu || '0.00',
      deviceCount: prepared.farmInfo?.deviceCount ?? 0,
      visible: true
    })
  } catch (e) {
    if (requestId !== farmClickRequestId) return
    console.error('[Map] 获取点击农场详情失败', e)
    ElMessage.error('获取农场信息失败')
  } finally {
    if (requestId === farmClickRequestId) {
      farmPopupLoading.value = false
    }
  }
}

/** 地块点击：打开地块信息弹窗（对齐移动端 openPoup(farmInfo, land)） */
function logic_landClick(landItem, index) {
  console.log('[Map] logic_landClick', landItem, index)
  if (!landItem) return

  // 关闭其它业务弹窗，保留地块选中描边
  waterDvPopupVisible.value = false
  activeWaterDv.value = null
  selectedWaterDvIndex.value = -1
  waterDvMarkerDrawer.resetAllWaterDvMarkers()
  farmPopupVisible.value = false
  clickedFarm.value = null
  clickedFarmDetail.value = null
  farmMarkerDrawer.hideAllFarmInfoCards()
  farmMarkerDrawer.resetAllFarmMarkers(
    farmList.value,
    farmStore.selectFarm?.id
  )
  landGroupPopupVisible.value = false
  clickedLandGroup.value = null
  landGroupPolygonDrawer.resetAllLandGroupBorder()

  // 优先用 farmInfo.lands 中的原始地块（含完整 area / deviceIds）
  let land = landItem
  const originLands = farmInfo.value?.lands
  if (Array.isArray(originLands) && landItem.id != null) {
    const matched = originLands.find(
      (item) => String(item.id) === String(landItem.id)
    )
    if (matched) {
      land = {
        ...landItem,
        ...matched,
        // 保留绘制层 deviceIds（已按 landId 绑定）
        deviceIds:
          Array.isArray(matched.deviceIds) && matched.deviceIds.length
            ? matched.deviceIds
            : landItem.deviceIds
      }
    }
  }

  landEditPopupVisible.value = false
  editingLand.value = null
  clickedLand.value = land
  landPopupVisible.value = true
}

/** 轮灌组点击：打开详情弹窗（对齐移动端 popGroup.openPoup） */
function logic_landGroupClick(groupItem, index) {
  console.log('[Map] logic_landGroupClick', groupItem, index)
  if (!groupItem?.id) return

  // 关闭其它业务弹窗，保留轮灌组选中描边
  waterDvPopupVisible.value = false
  activeWaterDv.value = null
  selectedWaterDvIndex.value = -1
  waterDvMarkerDrawer.resetAllWaterDvMarkers()
  farmPopupVisible.value = false
  clickedFarm.value = null
  clickedFarmDetail.value = null
  farmMarkerDrawer.hideAllFarmInfoCards()
  farmMarkerDrawer.resetAllFarmMarkers(
    farmList.value,
    farmStore.selectFarm?.id
  )
  landPopupVisible.value = false
  clickedLand.value = null
  landEditPopupVisible.value = false
  editingLand.value = null
  landPolygonDrawer.resetAllLandBorder()

  // 优先合并 list 轮询注入的运行态 / farmInfo.groupStatus
  let group = { ...groupItem }
  const statusMap = farmInfo.value?.groupStatus
  if (statusMap && groupItem.id != null) {
    const statusItem =
      statusMap[groupItem.id] ||
      statusMap[String(groupItem.id)] ||
      Object.values(statusMap).find(
        (item) => String(item?.id) === String(groupItem.id)
      )
    if (statusItem) {
      group = {
        ...group,
        ...statusItem,
        // 保留绘制用几何字段
        landPoint: groupItem.landPoint || group.landPoint,
        fillColor: groupItem.fillColor || group.fillColor,
        areaMu: groupItem.areaMu || group.areaMu
      }
    }
  }

  clickedLandGroup.value = group
  landGroupPopupVisible.value = true
}

/** 预留：出水桩点击业务（写 Store / 控制弹窗等） */
function logic_clickSingleWaterDv(payload) {
  console.log('[Map] logic_clickSingleWaterDv', payload)
  if (payload?.index != null) {
    selectedWaterDvIndex.value = payload.index
  }
  const device = payload?.device || null
  if (!device?.id) {
    console.warn('[Map] 出水桩缺少 id，无法打开弹窗')
    return
  }
  // 打开出水桩弹窗时关闭农场/地块/轮灌组弹窗
  farmPopupVisible.value = false
  clickedFarm.value = null
  clickedFarmDetail.value = null
  farmMarkerDrawer.hideAllFarmInfoCards()
  landPopupVisible.value = false
  clickedLand.value = null
  landPolygonDrawer.resetAllLandBorder()
  landEditPopupVisible.value = false
  editingLand.value = null
  landGroupPopupVisible.value = false
  clickedLandGroup.value = null
  landGroupPolygonDrawer.resetAllLandGroupBorder()
  activeWaterDv.value = device
  waterDvPopupVisible.value = true
}

/**
 * 出水桩绘制完成：
 * 1) 静默打用户定位点（不移动视角，对齐移动端 render_getH5OnlyMarker）
 * 2) 延迟批量逆地理地址（对齐移动端 batchUpdateWaterDvAddress）
 */
function logic_waterDvDrawFinish() {
  getH5LocationOnlyMarker()
  if (!isResolvedAddress) {
    if (waterDvAddressTimer) clearTimeout(waterDvAddressTimer)
    waterDvAddressTimer = setTimeout(() => {
      batchUpdateWaterDvAddress()
    }, 3000)
  }
}

/** 控制页「打开地图」：聚焦并打开对应出水桩弹窗 */
function tryOpenPendingMapDevice() {
  const pendingId = farmStore.consumePendingMapDeviceId?.()
  if (pendingId == null) return
  const index = waterDvList.value.findIndex(
    (d) => String(d.id) === String(pendingId)
  )
  if (index < 0) return
  const device = waterDvList.value[index]
  logic_clickSingleWaterDv({ device, index })
  const lng = device.longitude
  const lat = device.latitude
  if (
    mapInstance.value &&
    lng != null &&
    lat != null &&
    Number.isFinite(Number(lng)) &&
    Number.isFinite(Number(lat))
  ) {
    mapInstance.value.setZoomAndCenter?.(16, [Number(lng), Number(lat)])
  }
}

/** 农场 Marker 绘制器（对齐移动端 drawAllFarmMarker / createFarmMarker / clearFarmMark） */
const farmMarkerDrawer = createFarmMarkerDrawer({
  onFarmClick: logic_farmClick
})

/** 地块 Polygon 绘制器（对齐移动端 drawLandPolygon） */
const landPolygonDrawer = createLandPolygonDrawer({
  onLandClick: logic_landClick
})

/** 轮灌组 Polygon 绘制器（对齐移动端 drawLandGroupPolygon） */
const landGroupPolygonDrawer = createLandGroupPolygonDrawer({
  onLandGroupClick: logic_landGroupClick
})

/** 出水桩 Marker 绘制器（对齐移动端 drawAllWaterDvMarker） */
const waterDvMarkerDrawer = createWaterDvMarkerDrawer({
  onWaterDvClick: logic_clickSingleWaterDv,
  onWaterDvDrawFinish: logic_waterDvDrawFinish
})

/**
 * 对齐移动端 resetAllPopups：取消农场/地块/出水桩/轮灌组选中态，恢复普通态
 * 由地图空白区域点击触发（不作用于缩放、图层等 HTML 控件）
 */
const resetAllPopups = () => {
  selectedWaterDvIndex.value = -1
  waterDvPopupVisible.value = false
  activeWaterDv.value = null
  farmPopupVisible.value = false
  farmPopupLoading.value = false
  clickedFarm.value = null
  clickedFarmDetail.value = null
  landPopupVisible.value = false
  clickedLand.value = null
  landEditPopupVisible.value = false
  editingLand.value = null
  landGroupPopupVisible.value = false
  clickedLandGroup.value = null
  farmClickRequestId += 1
  farmMarkerDrawer.resetAllFarmMarkers(
    farmList.value,
    farmStore.selectFarm?.id
  )
  waterDvMarkerDrawer.resetAllWaterDvMarkers()
  landPolygonDrawer.resetAllLandBorder()
  landGroupPolygonDrawer.resetAllLandGroupBorder()
}

const onWaterDvPopupClose = () => {
  waterDvPopupVisible.value = false
  activeWaterDv.value = null
}

const onFarmPopupClose = () => {
  farmPopupVisible.value = false
  farmPopupLoading.value = false
  clickedFarm.value = null
  clickedFarmDetail.value = null
  farmClickRequestId += 1
  farmMarkerDrawer.hideAllFarmInfoCards()
  farmMarkerDrawer.resetAllFarmMarkers(
    farmList.value,
    farmStore.selectFarm?.id
  )
}

const onLandPopupClose = () => {
  landPopupVisible.value = false
  clickedLand.value = null
  landPolygonDrawer.resetAllLandBorder()
}

const onLandGroupPopupClose = () => {
  landGroupPopupVisible.value = false
  clickedLandGroup.value = null
  landGroupPolygonDrawer.resetAllLandGroupBorder()
}

/** 打开编辑地块弹窗（关闭信息弹窗，保留地块选中描边） */
const onEditLand = (payload) => {
  console.log('[Map] onEditLand', payload)
  landPopupVisible.value = false
  editingLand.value = payload || null
  landEditPopupVisible.value = true
}

const onLandEditClose = () => {
  landEditPopupVisible.value = false
  editingLand.value = null
}

/** 返回地块信息弹窗 */
const onLandEditBack = () => {
  landEditPopupVisible.value = false
  editingLand.value = null
  if (clickedLand.value) {
    landPopupVisible.value = true
  }
}

/** 从 farmInfo / 弹窗载荷解析完整地块原始数据 */
const resolveEditingLandRaw = (payload) => {
  const id = payload?.id ?? editingLand.value?.id
  if (id == null) return null
  const fromFarm = farmInfo.value?.lands?.find(
    (item) => String(item.id) === String(id)
  )
  return fromFarm || payload?.land || editingLand.value?.land || null
}

/** 写入 Store，供圈地页 edit 模式读取（对齐移动端 vuex_land） */
const buildLandStorePayload = (payload) => {
  const raw = resolveEditingLandRaw(payload)
  if (!raw?.id) return null
  const areaObj = parseAreaJson(raw.areaJson)
  const name =
    payload?.name?.trim() || raw.name || editingLand.value?.name || ''
  return {
    id: raw.id,
    name,
    landName: name,
    area: raw.area,
    areaMu: formatAreaMu(raw.area) ?? payload?.areaMu,
    areaJson: raw.areaJson,
    address: raw.address || '',
    longitude: raw.longitude,
    latitude: raw.latitude,
    coordinateType: raw.coordinateType ?? 1,
    deviceIds: raw.deviceIds || [],
    landPoint: areaObj.landPoint,
    fillColor: areaObj.fillColor,
    lng: raw.longitude,
    lat: raw.latitude
  }
}

/** 编辑地块区域 → 圈地页（对齐移动端 onClickArea → map-edit-plot?type=edit&landId=） */
const onLandEditArea = (payload) => {
  const landDraft = buildLandStorePayload(payload)
  if (!landDraft?.id) {
    ElMessage.warning('地块信息不完整，无法编辑区域')
    return
  }
  farmStore.setLand(landDraft)
  landEditPopupVisible.value = false
  editingLand.value = null
  landPopupVisible.value = false
  clickedLand.value = null
  landPolygonDrawer.resetAllLandBorder()
  router.push({
    path: '/map/edit-plot',
    query: { type: 'edit', landId: String(landDraft.id) }
  })
}

/** 删除地块：确认后调用 DELETE /api/land-plot/{id}（对齐移动端 deleteLandHttp） */
const onLandEditDelete = async (payload) => {
  const landId = payload?.id ?? editingLand.value?.id
  if (landId == null) {
    ElMessage.warning('地块信息不完整，无法删除')
    return
  }

  try {
    await ElMessageBox.confirm('请确认是否删除地块？', '删除地块', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  try {
    await deleteLand(landId)
    ElMessage.success('操作成功')
    landEditPopupVisible.value = false
    editingLand.value = null
    landPopupVisible.value = false
    clickedLand.value = null
    landPolygonDrawer.resetAllLandBorder()
    // 刷新农场 full，重绘地块/设备等资源
    await getFarmInfoHttp()
  } catch (e) {
    // 业务错误（如 49980 地块下存在设备）已由 request 拦截器提示
    console.error('[Map] 删除地块失败', e)
  }
}

/** 保存地块名称（对齐移动端 add-edit-land updateLandHttp，仅更新名称等元数据） */
const onLandEditSave = async (payload) => {
  const name = payload?.name?.trim()
  if (!name) {
    ElMessage.warning('请输入地块名称')
    return
  }
  const raw = resolveEditingLandRaw(payload)
  if (!raw?.id) {
    ElMessage.warning('地块信息不完整，无法保存')
    return
  }
  const farmId = farmStore.selectFarm?.id
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    return
  }

  try {
    const res = await updateLand({
      id: raw.id,
      farmId,
      name,
      area: raw.area,
      areaJson: raw.areaJson,
      address: raw.address || '',
      longitude: raw.longitude,
      latitude: raw.latitude,
      coordinateType: raw.coordinateType ?? 1,
      deviceIds: raw.deviceIds || []
    })
    if (res?.code === 200) {
      ElMessage.success('操作成功')
      landEditPopupVisible.value = false
      editingLand.value = null
      landPopupVisible.value = false
      clickedLand.value = null
      landPolygonDrawer.resetAllLandBorder()
      await getFarmInfoHttp()
    }
  } catch (e) {
    console.error('[Map] 保存地块失败', e)
  }
}

/** 进入其它农场（对齐系统左上角切换农场） */
const onEnterClickedFarm = (farm) => {
  const target = farm || clickedFarm.value
  if (!target?.id) return
  if (
    farmStore.selectFarm?.id != null &&
    String(farmStore.selectFarm.id) === String(target.id)
  ) {
    onFarmPopupClose()
    return
  }
  farmPopupVisible.value = false
  farmStore.setSelectFarm(target)
}

/**
 * 对齐移动端 syncDeviceRealStatus：把 status-by-farm 实时状态写入 waterDvList
 */
const syncDeviceRealStatus = (farmDeviceStatusList) => {
  if (
    !Array.isArray(waterDvList.value) ||
    !waterDvList.value.length ||
    !Array.isArray(farmDeviceStatusList) ||
    !farmDeviceStatusList.length
  ) {
    return
  }

  farmDeviceStatusList.forEach((realDev) => {
    const target = waterDvList.value.find(
      (dev) => String(dev.id) === String(realDev.id)
    )
    if (!target) return

    target.isOnline = realDev.isOnline
    if (realDev.batteryPercent != null) {
      target.batteryPercent = realDev.batteryPercent
    }
    if (realDev.name) target.name = realDev.name

    if (!target.specificData) target.specificData = {}
    if (!target.specificData.waterOutletPile) {
      target.specificData.waterOutletPile = {
        ...(realDev.waterOutletPile || {}),
        ports: Array.isArray(realDev.waterOutletPile?.ports)
          ? realDev.waterOutletPile.ports.map((p) => ({ ...p }))
          : []
      }
      return
    }

    const originPorts = target.specificData.waterOutletPile.ports
    const realPorts = realDev.waterOutletPile?.ports
    if (!Array.isArray(originPorts) || !Array.isArray(realPorts)) return

    realPorts.forEach((realPort) => {
      const originPort = originPorts.find(
        (p) => String(p.id) === String(realPort.id)
      )
      if (!originPort) return
      originPort.currentOpening = realPort.currentOpening
      originPort.pressure = realPort.pressure
    })
  })

  // 同步 farmInfo.devices（与 waterDvList 可能同引用，再保险写一遍）
  if (Array.isArray(farmInfo.value?.devices)) {
    farmInfo.value.devices = waterDvList.value
  }

  waterDvMarkerDrawer.refreshWaterDvMarkerStatus(waterDvList.value, {
    activeDvId: activeWaterDv.value?.id ?? null,
    map: mapInstance.value,
    layerOptions: layerOptions.value
  })

  if (waterDvPopupVisible.value && activeWaterDv.value?.id != null) {
    const live = waterDvList.value.find(
      (d) => String(d.id) === String(activeWaterDv.value.id)
    )
    waterDvPopupRef.value?.mergeFromFarmDevice?.(live)
  }
}

/** 对齐移动端 getFarmDeviceStatusHttp */
const getFarmDeviceStatusHttp = async () => {
  const farmId =
    farmStore.selectFarm?.id ?? farmInfo.value?.id ?? null
  if (farmId == null || !mapInited.value) return

  const requestId = ++farmDeviceStatusRequestId
  try {
    const res = await getFarmWaterOutletStatus(farmId)
    if (requestId !== farmDeviceStatusRequestId) return
    if (Array.isArray(res?.data)) {
      syncDeviceRealStatus(res.data)
    }
  } catch (e) {
    if (requestId !== farmDeviceStatusRequestId) return
    console.warn('[Map] 获取农场出水桩状态失败', e)
  }
}

const clearFarmDeviceStatusTimer = () => {
  if (farmDeviceStatusTimer) {
    clearInterval(farmDeviceStatusTimer)
    farmDeviceStatusTimer = null
  }
  farmDeviceStatusRequestId += 1
}

/**
 * 对齐移动端 getGroupListHttp：
 * 写入 farmInfo.groupStatus，并把运行态注入 landGroupList 后重绘
 */
const syncLandGroupStatus = (groupListFromApi) => {
  if (!farmInfo.value || !Array.isArray(groupListFromApi)) return

  const groupStatus = {}
  groupListFromApi.forEach((groupItem) => {
    if (groupItem?.id == null) return
    groupStatus[groupItem.id] = groupItem
  })
  farmInfo.value.groupStatus = groupStatus

  if (!Array.isArray(landGroupList.value) || !landGroupList.value.length) {
    return
  }

  landGroupList.value = landGroupList.value.map((landGroup) => {
    const statusItem = groupListFromApi.find(
      (item) => String(item.id) === String(landGroup.id)
    )
    if (!statusItem) return landGroup
    const area =
      statusItem.area != null ? statusItem.area : landGroup.area
    return {
      ...landGroup,
      isRunning: statusItem.deviceRuntime?.isRunning || false,
      protTotal: statusItem.protTotal,
      portOpeningCnt: statusItem.portOpeningCnt,
      deviceRuntime: statusItem.deviceRuntime,
      deviceNexRunTime: statusItem.deviceNexRunTime,
      name: statusItem.name || landGroup.name,
      area,
      areaMu: formatAreaMu(area) ?? landGroup.areaMu
    }
  })

  // 对齐移动端 render_updateLandGroupStatus → 重绘轮灌组
  drawLandGroupPolygon()
}

/** 对齐移动端 getGroupListHttp */
const getGroupListHttp = async () => {
  const farmId = farmInfo.value?.id ?? farmStore.selectFarm?.id ?? null
  if (farmId == null || !mapInited.value) return
  // 农场详情未就绪时跳过（对齐移动端 if (!this.farmInfo) return）
  if (!farmInfo.value) return

  const requestId = ++farmGroupStatusRequestId
  try {
    const res = await getGroupList({ farmId }, { silent: true })
    if (requestId !== farmGroupStatusRequestId) return
    if (Array.isArray(res?.data)) {
      syncLandGroupStatus(res.data)
    }
  } catch (e) {
    if (requestId !== farmGroupStatusRequestId) return
    console.warn('[Map] 获取轮灌组列表失败', e)
  }
}

const clearFarmGroupStatusTimer = () => {
  if (farmGroupStatusTimer) {
    clearInterval(farmGroupStatusTimer)
    farmGroupStatusTimer = null
  }
  farmGroupStatusRequestId += 1
}

/** 对齐移动端 setTimer 中的轮灌组 15s 轮询 */
const setFarmGroupStatusTimer = () => {
  clearFarmGroupStatusTimer()
  if (!mapInited.value) return
  if (farmStore.selectFarm?.id == null && farmInfo.value?.id == null) return

  getGroupListHttp()
  farmGroupStatusTimer = setInterval(() => {
    if (farmInfo.value != null) {
      getGroupListHttp()
    }
  }, FARM_GROUP_STATUS_POLL_MS)
}

/** 对齐移动端 setTimer：进入地图 / 切换农场后轮询 status-by-farm */
const setFarmDeviceStatusTimer = () => {
  clearFarmDeviceStatusTimer()
  if (!mapInited.value) return
  if (farmStore.selectFarm?.id == null && farmInfo.value?.id == null) return

  getFarmDeviceStatusHttp()
  farmDeviceStatusTimer = setInterval(() => {
    if (farmInfo.value != null || farmStore.selectFarm?.id != null) {
      getFarmDeviceStatusHttp()
    }
  }, FARM_DEVICE_STATUS_POLL_MS)
}

/** 启动地图侧实时状态轮询（出水桩 + 轮灌组） */
const setMapStatusTimers = () => {
  setFarmDeviceStatusTimer()
  setFarmGroupStatusTimer()
}

const clearMapStatusTimers = () => {
  clearFarmDeviceStatusTimer()
  clearFarmGroupStatusTimer()
}

/** 对齐移动端 setDeviceTimer：新增设备后每 30s 刷新 full，最多 5 次 */
let intervalTimerNewDevice = null
let intervalTimerNewDeviceCount = 0

const clearDeviceTimer = () => {
  if (intervalTimerNewDevice) {
    clearInterval(intervalTimerNewDevice)
    intervalTimerNewDevice = null
  }
  intervalTimerNewDeviceCount = 0
}

const setDeviceTimer = () => {
  clearDeviceTimer()
  intervalTimerNewDeviceCount = 5
  intervalTimerNewDevice = setInterval(() => {
    if (farmInfo.value == null) return
    if (intervalTimerNewDeviceCount > 0) {
      getFarmInfoHttp()
      intervalTimerNewDeviceCount -= 1
      console.log(
        '[Map] 定时刷新农场设备:剩余次数=' + intervalTimerNewDeviceCount
      )
    } else {
      clearDeviceTimer()
    }
  }, 30000)
}

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
/** 对齐移动端 isResolvedAddress：本农场出水桩地址是否已批量解析 */
let isResolvedAddress = false
let waterDvAddressTimer = null
let mapGeocoder = null

/** ---- 业务缓存（对齐移动端 map.vue 本地 data） ---- */
const farmList = ref([])
const farmInfo = ref(null)
const waterDvList = ref([])
const landList = ref([])
const landGroupList = ref([])
/** 图层勾选配置（默认全部显示；农场不受缩放限制，地块/出水桩需 zoom≥13） */
const layerOptions = ref(resolveLayerOptions(farmStore.s_map_layer))
const layerPanelExpanded = ref(false)
/** 当前农场无地块提示弹窗（对齐移动端 noLandPop / pop_polt_empty） */
const landEmptyVisible = ref(false)
/** 灌溉统计抽屉（对齐移动端 farm_data） */
const irrStatsVisible = ref(false)
/** 用户关闭/去新建后，同农场本次停留不再强制弹出无地块提示 */
let landEmptyDismissedFarmId = null
/** full 接口尚未返回、但地图已就绪时的占位；或农场切换时的防抖序号 */
let fullInfoRequestId = 0
let offFarmChange = null

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

const drawLandGroupPolygon = () => {
  if (!mapInstance.value || !mapInited.value) return
  landGroupPolygonDrawer.drawLandGroupPolygon(
    mapInstance.value,
    landGroupList.value,
    { layerOptions: layerOptions.value }
  )
}

const drawAllWaterDvMarker = () => {
  if (!mapInstance.value || !mapInited.value) return
  waterDvMarkerDrawer.drawAllWaterDvMarker(
    mapInstance.value,
    waterDvList.value,
    { layerOptions: layerOptions.value }
  )
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
  landGroupPolygonDrawer.refreshLandGroupLayerVisible(
    mapInstance.value,
    layerOptions.value,
    true
  )
  waterDvMarkerDrawer.refreshWaterDvLayerVisible(
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
  clearMapStatusTimers()
  if (waterDvAddressTimer) {
    clearTimeout(waterDvAddressTimer)
    waterDvAddressTimer = null
  }
  isResolvedAddress = false
  farmInfo.value = null
  waterDvList.value = []
  landList.value = []
  landGroupList.value = []
  selectedWaterDvIndex.value = -1
  waterDvPopupVisible.value = false
  activeWaterDv.value = null
  farmPopupVisible.value = false
  farmPopupLoading.value = false
  clickedFarm.value = null
  clickedFarmDetail.value = null
  landPopupVisible.value = false
  clickedLand.value = null
  landEditPopupVisible.value = false
  editingLand.value = null
  landGroupPopupVisible.value = false
  clickedLandGroup.value = null
  farmClickRequestId += 1
  farmStore.setFarmInfo(null)
  landEmptyVisible.value = false
  landEmptyDismissedFarmId = null
  landPolygonDrawer.clearAllLandPolygon(mapInstance.value)
  landGroupPolygonDrawer.clearAllLandGroupPolygon(mapInstance.value)
  waterDvMarkerDrawer.clearWaterDvMark(mapInstance.value)
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

  // 对齐移动端：lands 为空时弹出无地块提示（用户关闭后，同农场本次停留不再强制弹出）
  if (prepared.hasNoLand) {
    const farmId = prepared.farmInfo?.id ?? farmStore.selectFarm?.id
    if (
      farmId == null ||
      String(landEmptyDismissedFarmId) !== String(farmId)
    ) {
      landEmptyVisible.value = true
    }
  } else {
    landEmptyVisible.value = false
    landEmptyDismissedFarmId = null
  }

  return prepared
}

/** 跳转新建地块（对齐移动端 toAddLand → map-edit-plot?type=add） */
const handleCreateLand = () => {
  markLandEmptyDismissed()
  landEmptyVisible.value = false
  router.push({ path: '/map/edit-plot', query: { type: 'add', from: 'map' } })
}

/** 用户关闭无地块弹窗后，记录当前农场，避免轮询 full 再次强制打开 */
const markLandEmptyDismissed = () => {
  landEmptyDismissedFarmId =
    farmStore.selectFarm?.id ?? farmInfo.value?.id ?? null
}

const onLandEmptyClose = () => {
  markLandEmptyDismissed()
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
  clearMapStatusTimers()
  clearDeviceTimer()
  clearUserLocationMark()
  farmMarkerDrawer.destroy(mapInstance.value)
  landPolygonDrawer.destroy(mapInstance.value)
  landGroupPolygonDrawer.destroy(mapInstance.value)
  waterDvMarkerDrawer.destroy(mapInstance.value)
  clearAutoFitTimer()
  if (mapInstance.value) {
    mapInstance.value.off('click', onMapBlankClick)
    mapInstance.value.off('zoomchange', refreshAllLayerVisible)
    mapInstance.value.destroy()
    mapInstance.value = null
  }
  mapReady.value = false
  mapInited.value = false
  mapLoading.value = true
  locationConsentAsked = false
}

/** 进入地图 / 切换农场时适配视野层级 */
const FARM_VIEW_ZOOM = 17
const DEFAULT_MAP_CENTER = [116.397428, 39.90923]
/** 对齐移动端 autoFitMapView setFitView padding */
const FIT_VIEW_PADDING = [80, 80, 80, 80]

let autoFitTimer = null

/** 收集当前农场相关覆盖物，供 setFitView 使用（对齐移动端 autoFitMapView） */
const collectFitViewOverlays = () => {
  const currentFarmId = farmStore.selectFarm?.id
  const activeFarmMarkers =
    currentFarmId != null
      ? farmMarkerDrawer.farmMarkers.filter(
          (m) => String(m.__farmId) === String(currentFarmId)
        )
      : []

  const isOnMap = (overlay) => {
    try {
      return overlay?.getMap?.() != null
    } catch {
      return false
    }
  }

  return [
    ...activeFarmMarkers,
    ...waterDvMarkerDrawer.waterDvMarkers,
    ...landPolygonDrawer.landPolygonList,
    ...landGroupPolygonDrawer.landGroupPolygonList
  ].filter(isOnMap)
}

/**
 * 按覆盖物自适应视野（对齐移动端 renderjs autoFitMapView）
 */
const autoFitMapView = () => {
  if (!mapInstance.value) return

  const overlays = collectFitViewOverlays()
  if (!overlays.length) {
    centerMapByFarm(farmStore.selectFarm)
    return
  }

  setTimeout(() => {
    if (!mapInstance.value) return
    try {
      mapInstance.value.setFitView(overlays, false, FIT_VIEW_PADDING)
    } catch (e) {
      console.warn('[Map] setFitView 失败，回退农场中心定位', e)
      centerMapByFarm(farmStore.selectFarm)
    }
  }, 100)
}

/** 绘制完成后延迟适配；有待定位设备时跳过（对齐移动端 pendingFitDeviceId） */
const scheduleAutoFitMapView = (hadPendingDevice = false) => {
  if (autoFitTimer) {
    clearTimeout(autoFitTimer)
    autoFitTimer = null
  }
  if (hadPendingDevice) return

  autoFitTimer = setTimeout(() => {
    autoFitTimer = null
    autoFitMapView()
  }, 250)
}

const clearAutoFitTimer = () => {
  if (autoFitTimer) {
    clearTimeout(autoFitTimer)
    autoFitTimer = null
  }
}

/** 解析农场经纬度，无效则返回 null */
const resolveFarmLngLat = (farm) => {
  if (!farm) return null
  const longitude = Number(farm.longitude)
  const latitude = Number(farm.latitude)
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null
  return [longitude, latitude]
}

/**
 * 定位到农场视野。
 * skipIfSame：坐标/缩放已接近目标时跳过，避免进入地图后 full 返回再 setZoomAndCenter 触发瓦片重载白闪。
 */
const centerMapByFarm = (farm, { skipIfSame = false } = {}) => {
  if (!farm || !mapInstance.value) return
  const lngLat = resolveFarmLngLat(farm)
  if (!lngLat) return

  if (skipIfSame) {
    const currentZoom = mapInstance.value.getZoom?.()
    const currentCenter = mapInstance.value.getCenter?.()
    if (
      currentCenter &&
      Math.abs(currentZoom - FARM_VIEW_ZOOM) < 0.05 &&
      Math.abs(currentCenter.lng - lngLat[0]) < 1e-5 &&
      Math.abs(currentCenter.lat - lngLat[1]) < 1e-5
    ) {
      return
    }
  }

  mapInstance.value.setZoomAndCenter(FARM_VIEW_ZOOM, lngLat)
}

const handleZoomIn = () => {
  if (!mapInstance.value) return
  mapInstance.value.zoomIn()
}

const handleZoomOut = () => {
  if (!mapInstance.value) return
  mapInstance.value.zoomOut()
}

/**
 * 是否为业务覆盖物（农场/出水桩 Marker、地块/轮灌组 Polygon、中心 Text）
 * 空白点击时 e.target 常为 Map 或卫星/标注 TileLayer，不能用 !== map 判断
 */
const isBusinessMapOverlay = (target) => {
  if (!target || typeof window.AMap === 'undefined') return false
  const AMap = window.AMap
  return (
    (AMap.Marker && target instanceof AMap.Marker) ||
    (AMap.Polygon && target instanceof AMap.Polygon) ||
    (AMap.Text && target instanceof AMap.Text) ||
    (AMap.Polyline && target instanceof AMap.Polyline) ||
    (AMap.Circle && target instanceof AMap.Circle)
  )
}

/**
 * 地图空白点击：取消选中（对齐移动端 map.on('click') → resetAllPopups）
 * 点到业务覆盖物时不处理；缩放/图层等为页面 HTML，不会触发地图 click
 */
const onMapBlankClick = (e) => {
  if (!mapInstance.value) return
  if (isBusinessMapOverlay(e?.target)) return
  resetAllPopups()
}

const toggleLayerPanel = () => {
  layerPanelExpanded.value = !layerPanelExpanded.value
}

/** 打开灌溉统计抽屉（对齐移动端 showStatistics） */
const openIrrStats = () => {
  layerPanelExpanded.value = false
  irrStatsVisible.value = true
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
  // 对齐移动端 onLayerChange → vuex_layer
  farmStore.setMapLayer(layerOptions.value)
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
  drawUserMarkerNoMove(lng, lat)
}

/**
 * 仅打定位点、不移动视角（对齐移动端 drawUserMarkerNoMove）
 */
const drawUserMarkerNoMove = (lng, lat) => {
  if (!mapInstance.value || lng == null || lat == null) return

  clearUserLocationMark()

  const labelText = formatLatLngLabel(lat, lng)
  const dom = document.createElement('div')
  dom.style.cssText =
    'display:flex;flex-direction:column;align-items:center;pointer-events:none;transform:translateY(0);'
  dom.innerHTML = `
    <div style="background:rgba(45,45,45,0.88);color:#fff;font-size:${px2rem(14)};line-height:1.2;padding:${px2rem(5)} ${px2rem(10)};border-radius:${px2rem(4)};white-space:nowrap;margin-bottom:${px2rem(6)};box-shadow:0 2px 6px rgba(0,0,0,0.25);">
      ${labelText}
    </div>
    <img src="${locatePinIcon}" alt="" style="width:${px2rem(28)};height:${px2rem(36)};max-width:none;display:block;object-fit:contain;" />
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

/** 本页是否已做过进入时定位授权引导（避免出水桩重绘反复弹窗） */
let locationConsentAsked = false
const LOCATION_CONSENT_SKIP_KEY = 'map_location_consent_skip'

/** 查询浏览器定位权限状态 */
const queryGeolocationPermission = async () => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return 'unsupported'
  }
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return 'insecure'
  }
  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'geolocation' })
      return status.state // granted | denied | prompt
    }
  } catch (e) {
    console.warn('[Map] 查询定位权限失败', e)
  }
  return 'prompt'
}

/**
 * 进入地图页时引导授权：
 * 浏览器原生权限框只能由定位 API 触发；先弹应用内说明，用户同意后再请求定位。
 */
const ensureGeolocationConsent = async ({
  interactive = true,
  notifyDenied = true,
  forceAsk = false
} = {}) => {
  const state = await queryGeolocationPermission()
  if (state === 'unsupported') {
    if (interactive) ElMessage.warning('当前浏览器不支持定位')
    return false
  }
  if (state === 'insecure') {
    if (interactive) {
      ElMessage.warning('定位需在 HTTPS 环境下使用，请使用安全链接访问')
    }
    return false
  }
  if (state === 'granted') return true
  if (state === 'denied') {
    if (interactive && notifyDenied) {
      ElMessage.warning(
        '定位权限已关闭，请点击浏览器地址栏左侧的锁/站点设置，允许位置权限后刷新重试'
      )
    }
    return false
  }
  // prompt：尚未授权，先应用内确认，再触发原生权限框
  if (!interactive) return false
  if (!forceAsk && sessionStorage.getItem(LOCATION_CONSENT_SKIP_KEY) === '1') {
    return false
  }
  try {
    await ElMessageBox.confirm(
      '地图定位需要获取您的位置信息，用于在地图上显示当前位置。是否允许使用定位？',
      '定位权限',
      {
        confirmButtonText: '允许',
        cancelButtonText: '暂不',
        type: 'info',
        closeOnClickModal: false
      }
    )
    sessionStorage.removeItem(LOCATION_CONSENT_SKIP_KEY)
    return true
  } catch {
    sessionStorage.setItem(LOCATION_CONSENT_SKIP_KEY, '1')
    return false
  }
}

/** 使用高德 Geolocation 获取当前位置 */
const requestAmapPosition = (timeout = 10000) =>
  new Promise((resolve) => {
    if (typeof window.AMap === 'undefined') {
      resolve(null)
      return
    }
    window.AMap.plugin('AMap.Geolocation', () => {
      const geo = new window.AMap.Geolocation({
        enableHighAccuracy: true,
        timeout,
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
            resolve({ lng, lat })
            return
          }
        }
        console.warn('[Map] 定位失败', status, result)
        resolve(null)
      })
    })
  })

/** 对齐移动端 getH5LocationOnlyMarker：进入页引导授权后打点（不移动视角） */
const getH5LocationOnlyMarker = async () => {
  if (!mapInstance.value || typeof window.AMap === 'undefined') return
  if (locationConsentAsked) return
  locationConsentAsked = true

  const ok = await ensureGeolocationConsent({
    interactive: true,
    notifyDenied: false
  })
  if (!ok) return

  const pos = await requestAmapPosition(10000)
  if (pos) drawUserMarkerNoMove(pos.lng, pos.lat)
}

const ensureMapGeocoder = () =>
  new Promise((resolve) => {
    if (mapGeocoder) {
      resolve(mapGeocoder)
      return
    }
    if (typeof window.AMap === 'undefined') {
      resolve(null)
      return
    }
    window.AMap.plugin('AMap.Geocoder', () => {
      mapGeocoder = new window.AMap.Geocoder({
        radius: 1000,
        extensions: 'all'
      })
      resolve(mapGeocoder)
    })
  })

/** 对齐移动端 getWaterDvAddress */
const getWaterDvAddress = async (dv) => {
  const geocoder = await ensureMapGeocoder()
  if (!geocoder || dv?.longitude == null || dv?.latitude == null) {
    if (dv) dv.address = dv.address || '地址解析失败'
    return
  }
  await new Promise((resolve) => {
    geocoder.getAddress([dv.longitude, dv.latitude], (status, result) => {
      if (
        status === 'complete' &&
        result.info === 'OK' &&
        result.regeocode
      ) {
        dv.address = result.regeocode.formattedAddress || '未知地址'
      } else {
        dv.address = dv.address || '地址解析失败'
      }
      resolve()
    })
  })
}

/** 对齐移动端 batchUpdateWaterDvAddress */
const batchUpdateWaterDvAddress = async () => {
  const list = waterDvList.value
  if (!Array.isArray(list) || !list.length) {
    isResolvedAddress = true
    return
  }
  for (const item of list) {
    await getWaterDvAddress(item)
  }
  isResolvedAddress = true
  waterDvMarkerDrawer.refreshWaterDvMarkerStatus(list, {
    activeDvId: activeWaterDv.value?.id ?? null,
    map: mapInstance.value,
    layerOptions: layerOptions.value
  })
  if (waterDvPopupVisible.value && activeWaterDv.value?.id != null) {
    const live = list.find(
      (d) => String(d.id) === String(activeWaterDv.value.id)
    )
    waterDvPopupRef.value?.mergeFromFarmDevice?.(live)
  }
}

/** 点击定位：使用高德 Geolocation（浏览器定位，坐标转 GCJ-02） */
const handleLocate = async () => {
  if (!mapInstance.value || !mapInited.value || isLocating.value) return

  if (typeof window.AMap === 'undefined') {
    ElMessage.error('地图 SDK 未加载')
    return
  }

  const ok = await ensureGeolocationConsent({
    interactive: true,
    forceAsk: true
  })
  if (!ok) return

  isLocating.value = true
  try {
    const pos = await requestAmapPosition(12000)
    if (pos) {
      drawUserPoint(pos.lng, pos.lat)
      return
    }
    const state = await queryGeolocationPermission()
    if (state === 'denied') {
      ElMessage.error(
        '定位权限已关闭，请在浏览器地址栏允许位置权限后重试'
      )
    } else {
      ElMessage.error('定位失败，请检查浏览器定位权限或稍后重试')
    }
  } finally {
    isLocating.value = false
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

  clearMapStatusTimers()
  const requestId = ++fullInfoRequestId
  try {
    const fullData = await farmStore.fetchFarmFullInfo(id)
    if (requestId !== fullInfoRequestId) return null

    const prepared = applyFarmFullResources(fullData)
    const hadPendingDevice = farmStore.s_pending_map_device_id != null
    drawAllFarmMarker()
    drawLandPolygon()
    drawLandGroupPolygon()
    drawAllWaterDvMarker()
    // 对齐移动端：覆盖物绘制完成后 setFitView；有待定位设备时不适配
    scheduleAutoFitMapView(hadPendingDevice)
    // 对齐移动端 setTimer：full 就绪后轮询出水桩 + 轮灌组
    setMapStatusTimers()
    // 设备控制页跳转地图：延迟定位设备，避免被 autoFit 覆盖
    if (hadPendingDevice) {
      setTimeout(() => tryOpenPendingMapDevice(), 300)
    } else {
      nextTick(() => tryOpenPendingMapDevice())
    }
    return prepared
  } catch (e) {
    if (requestId !== fullInfoRequestId) return null
    console.error('获取农场详情失败', e)
    clearMapStatusTimers()
    resetFarmMapResources()
    centerMapByFarm(farmStore.selectFarm, { skipIfSame: true })
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
    // 仅使用卫星底图，不叠加矢量标注层，避免展示行政区划/POI 等地理文字。
    const satelliteLayer = new window.AMap.TileLayer.Satellite({
      opacity: 1,
      zIndex: 1
    })

    const farmLngLat =
      resolveFarmLngLat(farmStore.selectFarm) ||
      resolveFarmLngLat(farmStore.s_selectFarm)
    const initialCenter = farmLngLat || DEFAULT_MAP_CENTER
    const initialZoom = farmLngLat ? FARM_VIEW_ZOOM : 14

    mapInstance.value = new window.AMap.Map('map-container', {
      zoom: initialZoom,
      zooms: [3, 26],
      center: initialCenter,
      viewMode: '2D',
      layers: [satelliteLayer],
      showLabel: false
    })
    currentMapType.value = 'satellite'
    mapError.value = ''

    mapInstance.value.on('complete', onMapComplete)
    // 空白点击取消业务图形选中态（对齐移动端 resetAllPopups）
    mapInstance.value.on('click', onMapBlankClick)
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
  // 对齐移动端 farmMsg.addNewDevice → setDeviceTimer
  if (payload?.topic === 'addNewDevice') {
    farmStore.consumePendingAddNewDevice()
    setDeviceTimer()
    return
  }

  syncFarmListFromStore()
  clearDeviceTimer()

  // 切换农场时关闭未关的出水桩弹窗，并清除业务图形选中态
  resetAllPopups()

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

  // 添加设备页跳转过来时地图尚未挂载，落旗后在此消费并启动刷新定时器
  if (farmStore.consumePendingAddNewDevice()) {
    setDeviceTimer()
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
  clearMapStatusTimers()
  clearDeviceTimer()
  if (waterDvAddressTimer) {
    clearTimeout(waterDvAddressTimer)
    waterDvAddressTimer = null
  }
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
  waterDvPopupVisible,
  activeWaterDv,
  farmPopupVisible,
  clickedFarm,
  clickedFarmDetail,
  landPopupVisible,
  clickedLand,
  landEditPopupVisible,
  editingLand,
  landGroupPopupVisible,
  clickedLandGroup,
  currentMapType,
  mapLoading,
  farmMarkerDrawer,
  landPolygonDrawer,
  landGroupPolygonDrawer,
  waterDvMarkerDrawer,
  drawAllFarmMarker,
  drawLandPolygon,
  drawLandGroupPolygon,
  drawAllWaterDvMarker,
  logic_farmClick,
  logic_landClick,
  logic_landGroupClick,
  logic_clickSingleWaterDv,
  logic_waterDvDrawFinish,
  resetAllPopups,
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

/* 隐藏高德地图左下角 Logo / 版权 */
.map-page :deep(.amap-logo),
.map-page :deep(.amap-copyright),
.map-page :deep(.amap-mcode) {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

/* 对齐移动端：左下角能手地图标志 */
.map-brand-logo {
  position: absolute;
  left: 8px;
  bottom: 12px;
  z-index: 9;
  display: flex;
  align-items: center;
  pointer-events: none;
  user-select: none;
}

.map-brand-logo__img {
  width: 18px;
  height: 18px;
  margin-right: 6px;
  object-fit: contain;
  display: block;
}

.map-brand-logo__text {
  font-size: 12px;
  color: #fff;
  line-height: 1;
  white-space: nowrap;
}

.map-loading-mask {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.map-loading-mask__text {
  font-size: 16px;
  color: #666;
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
  font-size: 12px;
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
  font-size: 14px;
  color: #999;
  line-height: 1;
}

/* 统计按钮（图层工具栏下方，对齐移动端「统计」） */
.map-stats-btn {
  margin-top: 10px;
  width: 48px;
  padding: 10px 0 9px;
  border: none;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.map-stats-btn:hover {
  background: #f5f5f5;
}

.map-stats-btn__icon {
  font-size: 20px;
  color: #666;
  line-height: 1;
}

.map-stats-btn__text {
  font-size: 11px;
  color: #666;
  line-height: 1.2;
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
