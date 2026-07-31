<template>
  <div class="device-page" @click="clearDeviceAction">
    <!-- 空态：农场下无任何设备 -->
    <div v-if="showEmpty" class="device-empty">
      <img
        class="device-empty__img"
        src="@/assets/device/device-empty.png"
        alt=""
      />
      <p class="device-empty__text">嗨！您还没有设备，请添加设备</p>
      <button type="button" class="device-empty__btn" @click.stop="onAddDevice">
        添加设备
      </button>
    </div>

    <!-- 有设备：按地块分组 -->
    <template v-else-if="deviceLandList">
      <div class="device-toolbar">
        <el-radio-group
          v-model="tabIndex"
          class="device-tabs"
          @change="onChangeTab"
        >
          <el-radio-button
            v-for="(tab, idx) in tabList"
            :key="tab.key"
            :value="idx"
          >
            {{ tab.label }}
          </el-radio-button>
        </el-radio-group>
        <el-button
          type="primary"
          class="device-toolbar__add"
          @click.stop="onAddDevice"
        >
          <span class="device-toolbar__add-icon">+</span>
          添加新设备
        </el-button>
      </div>

      <div class="device-scroll">
        <div
          v-for="land in visibleLandList"
          :key="land.landId"
          class="device-land"
        >
          <div class="device-land__header">
            <div class="device-land__title">
              <el-popover
                :visible="landMenuLandId === String(land.landId)"
                placement="bottom-start"
                :width="160"
                trigger="click"
                :show-arrow="false"
                popper-class="device-land-menu-popper"
                @update:visible="(v) => onLandMenuVisible(land, v)"
              >
                <template #reference>
                  <button
                    type="button"
                    class="device-land__name"
                    @click.stop="toggleLandMenu(land)"
                  >
                    {{ land.landName || '未命名地块' }}
                  </button>
                </template>
                <div class="device-land-menu" @click.stop>
                  <button
                    type="button"
                    class="device-land-menu__item"
                    @click="onEditLand(land)"
                  >
                    <i class="iconfont icon-a-device_ic_edit1"></i>
                    编辑地块
                  </button>
                  <button
                    type="button"
                    class="device-land-menu__item is-danger"
                    @click="onDeleteLand(land)"
                  >
                    <i class="iconfont icon-land_ic_dele"></i>
                    删除地块
                  </button>
                </div>
              </el-popover>
              <span class="device-land__running">
                {{ getLandRunningText(land) }}
              </span>
            </div>
            <button
              v-if="hasMoreDevices(land)"
              type="button"
              class="device-land__more"
              :class="{ 'is-expanded': isLandExpanded(land) }"
              @click.stop="toggleLandExpand(land)"
            >
              <span class="device-land__more-text">
                {{ isLandExpanded(land) ? '收起' : '更多' }}
              </span>
              <el-icon class="device-land__more-icon"><ArrowDown /></el-icon>
            </button>
          </div>

          <div class="device-grid">
            <button
              v-if="!land.devices?.length && tabIndex === 0"
              type="button"
              class="device-add-card"
              @click.stop="onAddDevice"
            >
              <i class="iconfont icon-device_ic_add"></i>
              <span>添加设备</span>
            </button>

            <div
              v-for="device in getDisplayDevices(land)"
              :key="device.id"
              class="device-card"
              :class="{
                'is-offline': !device.isOnline,
                'is-action': actionDeviceId === String(device.id)
              }"
              @click.stop="onDeviceClick(device)"
              @pointerdown="onDevicePointerDown($event, device)"
              @pointerup="onDevicePointerUp"
              @pointerleave="onDevicePointerUp"
              @pointercancel="onDevicePointerUp"
              @contextmenu.prevent="onDeviceLongPress(device)"
            >
              <div class="device-card__top">
                <span
                  class="device-card__status"
                  :class="device.isOnline ? 'is-online' : 'is-offline'"
                >
                  <i class="device-card__status-dot"></i>
                  {{ device.isOnline ? '在线运行' : '离线状态' }}
                </span>
                <span
                  v-if="device.batteryPercent != null"
                  class="device-card__battery"
                  :class="batteryClass(device.batteryPercent)"
                >
                  <i class="iconfont icon-map_ic_battery"></i>
                  {{ device.batteryPercent ?? 0 }}%
                </span>
              </div>

              <div class="device-card__name">{{ device.name || '未命名设备' }}</div>

              <div class="device-card__body">
                <img
                  class="device-card__img"
                  :src="device.isOnline ? outletOnlineImg : outletOfflineImg"
                  alt=""
                />
              </div>

              <div class="device-card__ports">
                <div
                  class="device-card__port"
                  :class="portSwitchClass(device, portA(device))"
                >
                  <span class="device-card__port-pct">
                    {{ portOpenText(portA(device)) }}%
                  </span>
                  <span class="device-card__port-name">
                    {{ portLabel(portA(device), 'A') }}
                  </span>
                </div>
                <div
                  class="device-card__port"
                  :class="portSwitchClass(device, portB(device))"
                >
                  <span class="device-card__port-name">
                    {{ portLabel(portB(device), 'B') }}
                  </span>
                  <span class="device-card__port-pct">
                    {{ portOpenText(portB(device)) }}%
                  </span>
                </div>
              </div>

              <!-- 长按操作层 -->
              <div
                v-if="actionDeviceId === String(device.id)"
                class="device-card__mask"
                @click.stop
              >
                <button
                  type="button"
                  class="device-card__action is-edit"
                  @click.stop="onEditDevice(device)"
                >
                  <i class="iconfont icon-a-device_ic_edit1"></i>
                  编辑
                </button>
                <button
                  type="button"
                  class="device-card__action is-delete"
                  @click.stop="onDeleteDevice(device)"
                >
                  <i class="iconfont icon-device_ic_delete"></i>
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="loading" class="device-loading">加载中...</div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { useFarmStore } from '@/store/farm'
import { deleteDevice, getDeviceGroupByLands } from '@/api/device'
import { deleteLand } from '@/api/map'
import outletOnlineImg from '@/assets/map/outlet-device-online.svg'
import outletOfflineImg from '@/assets/map/outlet-device-offline.svg'

const farmStore = useFarmStore()

const deviceLandList = ref(null)
const loading = ref(false)
const tabIndex = ref(0)
const searchText = ref('')
const actionDeviceId = ref(null)
const landMenuLandId = ref(null)
/** 地块设备卡片展开状态（>4 台时点「更多」展开） */
const expandedLandIds = ref({})

const LAND_CARD_LIMIT = 4
const POLL_MS = 3000
const LONG_PRESS_MS = 550
let pollTimer = null
let listRequestId = 0
let offFarmChange = null
let longPressTimer = null
let longPressTriggered = false

const counts = computed(() => {
  let total = 0
  let online = 0
  let offline = 0
  const list = deviceLandList.value || []
  list.forEach((land) => {
    ;(land.devices || []).forEach((dev) => {
      total += 1
      if (dev.isOnline) online += 1
      else offline += 1
    })
  })
  return { total, online, offline }
})

const tabList = computed(() => [
  { key: 'all', label: `全部(${counts.value.total})` },
  { key: 'online', label: `在线(${counts.value.online})` },
  { key: 'offline', label: `离线(${counts.value.offline})` }
])

/** 无任何设备且非搜索态 → 空态 */
const showEmpty = computed(() => {
  if (!deviceLandList.value) return false
  if (searchText.value) return false
  return counts.value.total <= 0
})

const visibleLandList = computed(() => {
  const list = deviceLandList.value || []
  if (tabIndex.value === 0) return list
  return list.filter((land) => getVisibleDevices(land).length > 0)
})

const getFarmId = () =>
  farmStore.s_selectFarm?.id ??
  farmStore.selectFarm?.id ??
  farmStore.s_farm_info?.id ??
  null

const findPort = (device, outletNo) => {
  const ports = device?.specificData?.waterOutletPile?.ports
  if (!Array.isArray(ports)) return null
  return ports.find((p) => Number(p.outletNo) === outletNo) || null
}

const portA = (device) => findPort(device, 1)
const portB = (device) => findPort(device, 2)

const portOpenText = (port) => {
  const n = Number(port?.currentOpening)
  if (!Number.isFinite(n)) return 0
  return Math.round(n)
}

const portLabel = (port, fallback) => port?.outletName || fallback

/** 开启 #00C970，关闭 #FF2F30；离线置灰 */
const portSwitchClass = (device, port) => {
  if (!device?.isOnline) return 'is-muted'
  return Number(port?.currentOpening) > 0 ? 'is-open' : 'is-closed'
}

const batteryClass = (percent) => {
  const n = Number(percent)
  if (!Number.isFinite(n) || n <= 20) return 'is-low'
  if (n >= 50) return 'is-good'
  return ''
}

const getVisibleDevices = (land) => {
  const devices = land?.devices || []
  if (tabIndex.value === 0) return devices
  if (tabIndex.value === 1) return devices.filter((d) => !!d.isOnline)
  if (tabIndex.value === 2) return devices.filter((d) => !d.isOnline)
  return devices
}

const hasMoreDevices = (land) =>
  getVisibleDevices(land).length > LAND_CARD_LIMIT

const isLandExpanded = (land) =>
  !!expandedLandIds.value[String(land.landId)]

/** 未展开时最多展示 4 张卡片 */
const getDisplayDevices = (land) => {
  const devices = getVisibleDevices(land)
  if (isLandExpanded(land)) return devices
  return devices.slice(0, LAND_CARD_LIMIT)
}

const getLandRunningText = (land) => {
  const online = (land?.devices || []).filter((d) => d.isOnline).length
  return `${online}台设备正在运行`
}

const clearDeviceAction = () => {
  actionDeviceId.value = null
  landMenuLandId.value = null
}

const onChangeTab = () => {
  clearDeviceAction()
  expandedLandIds.value = {}
}

const onLandMenuVisible = (land, visible) => {
  landMenuLandId.value = visible ? String(land.landId) : null
}

const toggleLandMenu = (land) => {
  const id = String(land.landId)
  landMenuLandId.value = landMenuLandId.value === id ? null : id
  actionDeviceId.value = null
}

const toggleLandExpand = (land) => {
  const id = String(land.landId)
  expandedLandIds.value = {
    ...expandedLandIds.value,
    [id]: !expandedLandIds.value[id]
  }
  landMenuLandId.value = null
  actionDeviceId.value = null
}

const clearLongPressTimer = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

const onDevicePointerDown = (e, device) => {
  if (e.button != null && e.button !== 0) return
  longPressTriggered = false
  clearLongPressTimer()
  longPressTimer = setTimeout(() => {
    longPressTriggered = true
    onDeviceLongPress(device)
  }, LONG_PRESS_MS)
}

const onDevicePointerUp = () => {
  clearLongPressTimer()
}

const onDeviceLongPress = (device) => {
  clearLongPressTimer()
  landMenuLandId.value = null
  actionDeviceId.value = String(device.id)
}

const onDeviceClick = (device) => {
  if (longPressTriggered) {
    longPressTriggered = false
    return
  }
  if (actionDeviceId.value === String(device.id)) return
  clearDeviceAction()
  console.log('[Device] toControl 预留出口', device)
}

/** 添加设备：预留业务出口 */
const onAddDevice = () => {
  console.log('[Device] onAddDevice 预留出口')
  ElMessage.info('添加设备功能开发中')
}

/** 编辑设备：预留业务出口 */
const onEditDevice = (device) => {
  console.log('[Device] onEditDevice 预留出口', device)
  ElMessage.info('编辑设备功能开发中')
}

const onDeleteDevice = async (device) => {
  if (!device?.id) return
  try {
    await ElMessageBox.confirm('请确认是否删除该设备？', '删除设备', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await deleteDevice(device.id)
    ElMessage.success('操作成功')
    clearDeviceAction()
    await fetchDeviceList({ silent: false })
  } catch (e) {
    console.error('[Device] 删除设备失败', e)
  }
}

/** 编辑地块：预留业务出口 */
const onEditLand = (land) => {
  console.log('[Device] onEditLand 预留出口', land)
  landMenuLandId.value = null
  ElMessage.info('编辑地块功能开发中')
}

const onDeleteLand = async (land) => {
  if (land?.landId == null) return
  landMenuLandId.value = null
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
    await deleteLand(land.landId)
    ElMessage.success('操作成功')
    await fetchDeviceList({ silent: false })
  } catch (e) {
    console.error('[Device] 删除地块失败', e)
  }
}

/**
 * 静默轮询合并：同步在线/电量/开度，保留本地列表结构
 */
const mergeDeviceLandList = (oldList, newList) => {
  if (!Array.isArray(oldList) || !Array.isArray(newList)) return newList
  const next = oldList.map((oldLand) => {
    const newLand = newList.find(
      (nl) => String(nl.landId) === String(oldLand.landId)
    )
    if (!newLand) return oldLand
    const devices = (oldLand.devices || []).map((oldDev) => {
      const newDev = (newLand.devices || []).find(
        (nd) => String(nd.id) === String(oldDev.id)
      )
      if (!newDev) return oldDev
      const merged = {
        ...oldDev,
        ...newDev,
        specificData: {
          ...(oldDev.specificData || {}),
          ...(newDev.specificData || {})
        }
      }
      const newPile = newDev.specificData?.waterOutletPile
      if (newPile) {
        merged.specificData.waterOutletPile = {
          ...(oldDev.specificData?.waterOutletPile || {}),
          ...newPile
        }
      }
      return merged
    })
    // 追加新增设备
    ;(newLand.devices || []).forEach((nd) => {
      if (!devices.some((d) => String(d.id) === String(nd.id))) {
        devices.push({ ...nd })
      }
    })
    return {
      ...oldLand,
      ...newLand,
      devices
    }
  })
  // 追加新地块
  newList.forEach((nl) => {
    if (!next.some((l) => String(l.landId) === String(nl.landId))) {
      next.push({ ...nl, devices: [...(nl.devices || [])] })
    }
  })
  return next
}

const fetchDeviceList = async ({ silent = false } = {}) => {
  const farmId = getFarmId()
  if (farmId == null) {
    deviceLandList.value = []
    return
  }

  const requestId = ++listRequestId
  if (!silent && deviceLandList.value == null) loading.value = true

  try {
    const res = await getDeviceGroupByLands(
      {
        farmId,
        searchText: searchText.value || ''
      },
      { silent }
    )
    if (requestId !== listRequestId) return
    const data = Array.isArray(res?.data) ? res.data : []
    if (deviceLandList.value == null || !silent) {
      deviceLandList.value = data.map((land) => ({
        ...land,
        devices: Array.isArray(land.devices)
          ? land.devices.map((d) => ({ ...d }))
          : []
      }))
    } else {
      deviceLandList.value = mergeDeviceLandList(deviceLandList.value, data)
    }
  } catch (e) {
    if (requestId !== listRequestId) return
    console.error('[Device] 获取设备列表失败', e)
    if (deviceLandList.value == null) deviceLandList.value = []
  } finally {
    if (requestId === listRequestId) loading.value = false
  }
}

const clearPoll = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  listRequestId += 1
}

const startPoll = () => {
  clearPoll()
  fetchDeviceList({ silent: false })
  pollTimer = setInterval(() => {
    fetchDeviceList({ silent: true })
  }, POLL_MS)
}

const handleFarmChange = () => {
  clearDeviceAction()
  expandedLandIds.value = {}
  deviceLandList.value = null
  startPoll()
}

onMounted(() => {
  offFarmChange = farmStore.onFarmChange(handleFarmChange)
  startPoll()
})

onUnmounted(() => {
  offFarmChange?.()
  clearPoll()
  clearLongPressTimer()
})
</script>

<style scoped>
.device-page {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: #f7fafc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.device-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.device-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f7fafc;
  padding: 24px;
}

.device-empty__img {
  width: 160px;
  height: 160px;
  object-fit: contain;
}

.device-empty__text {
  margin: 20px 0 0;
  font-size: 15px;
  color: #909399;
  line-height: 1.5;
}

.device-empty__btn {
  margin-top: 20px;
  min-width: 140px;
  height: 40px;
  padding: 0 24px;
  border: none;
  border-radius: 20px;
  background: #2f6bff;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.device-empty__btn:hover {
  background: #2560e8;
}

.device-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px 12px;
  background: #f7fafc;
}

.device-tabs {
  display: inline-flex;
  align-items: stretch;
  width: 372px;
  height: 58px;
  box-sizing: border-box;
  padding: 6px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(31, 45, 61, 0.08);
}

.device-tabs :deep(.el-radio-button) {
  flex: 1;
  height: auto;
  margin: 0;
  display: flex !important;
  align-items: stretch;
  --el-radio-button-checked-bg-color: #3653a0;
  --el-radio-button-checked-text-color: #fff;
  --el-radio-button-checked-border-color: transparent;
  --el-border: none;
}

.device-tabs :deep(.el-radio-button__inner) {
  width: 100%;
  height: 100% !important;
  min-height: 0;
  padding: 0 12px !important;
  border: 0 !important;
  border-color: transparent !important;
  border-radius: 0 !important;
  outline: none !important;
  outline-offset: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  font-weight: bold;
  line-height: 20px;
  text-align: center;
  display: flex !important;
  align-items: center;
  justify-content: center;
  letter-spacing: 0;
  color: #3653a0;
  vertical-align: middle;
}

.device-tabs :deep(.el-radio-button__inner:hover) {
  color: #3653a0;
}

.device-tabs :deep(.el-radio-button.is-active .el-radio-button__inner),
.device-tabs :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: #3653a0 !important;
  color: #fff !important;
  font-weight: bold;
  border: 0 !important;
  border-radius: 12px !important;
  outline: none !important;
  box-shadow: none !important;
}

.device-tabs :deep(.el-radio-button:first-child .el-radio-button__inner),
.device-tabs :deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 !important;
}

.device-tabs :deep(.el-radio-button.is-active:first-child .el-radio-button__inner),
.device-tabs :deep(.el-radio-button.is-active:last-child .el-radio-button__inner),
.device-tabs
  :deep(
    .el-radio-button:first-child
      .el-radio-button__original-radio:checked
      + .el-radio-button__inner
  ),
.device-tabs
  :deep(
    .el-radio-button:last-child
      .el-radio-button__original-radio:checked
      + .el-radio-button__inner
  ) {
  border-radius: 12px !important;
}

.device-tabs :deep(.el-radio-button + .el-radio-button) {
  margin-left: 0;
}

.device-tabs :deep(.el-radio-button__original-radio:focus-visible + .el-radio-button__inner) {
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
}

.device-toolbar__add {
  width: 188px;
  height: 56px;
  padding: 0 16px;
  border-radius: 12px;
  background: #3653a0;
  border-color: #3653a0;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 16px;
  font-weight: bold;
  line-height: 24px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.4px;
}

.device-toolbar__add:hover,
.device-toolbar__add:focus {
  background: #2f4a90;
  border-color: #2f4a90;
}

.device-toolbar__add-icon {
  margin-right: 4px;
  font-size: 16px;
  font-weight: bold;
  line-height: 24px;
  letter-spacing: 0.4px;
}

.device-scroll {
  flex: 1;
  overflow: auto;
  padding: 4px 20px 24px;
}

.device-land {
  margin-top: 16px;
}

.device-land__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  min-height: 40px;
}

.device-land__title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.device-land__name {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 20px;
  font-weight: bold;
  line-height: 40px;
  display: flex;
  align-items: center;
  letter-spacing: 0;
  color: #0f172a;
}

.device-land__name:hover {
  color: #3653a0;
}

.device-land__running {
  height: 28px;
  padding: 0 12px;
  border-radius: 14px;
  background: #edf1f7;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  font-weight: bold;
  line-height: 24px;
  display: inline-flex;
  align-items: center;
  letter-spacing: 0;
  color: #3653a0;
  white-space: nowrap;
}

.device-land__more {
  width: 111px;
  height: 46px;
  border-radius: 24px;
  opacity: 1;
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  gap: 8px;
  box-sizing: border-box;
  border: 1px solid rgba(54, 83, 160, 0.1);
  background: #f7fafc;
  flex-shrink: 0;
  white-space: nowrap;
  cursor: pointer;
}

.device-land__more:hover {
  background: #eef2f7;
}

.device-land__more-text {
  flex-shrink: 0;
  white-space: nowrap;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  font-weight: bold;
  line-height: 20px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  letter-spacing: 0;
  font-feature-settings: 'kern' on;
  color: #3653a0;
}

.device-land__more-icon {
  flex-shrink: 0;
  font-size: 14px;
  color: #3653a0;
  transition: transform 0.2s ease;
}

.device-land__more.is-expanded .device-land__more-icon {
  transform: rotate(180deg);
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  height: auto;
}

.device-add-card {
  height: 320px;
  border: 1px dashed #c0c4cc;
  border-radius: 16px;
  background: #fff;
  color: #2f6bff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.device-add-card .iconfont {
  font-size: 28px;
}

.device-card {
  position: relative;
  height: 320px;
  padding: 20px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.device-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 18px;
  flex-shrink: 0;
}

.device-card__status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 18px;
  padding: 0 8px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  box-sizing: border-box;
}

.device-card__status.is-online {
  background: rgba(46, 204, 113, 0.12);
  color: #2ecc71;
}

.device-card__status.is-offline {
  background: #f0f2f5;
  color: #909399;
}

.device-card__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.device-card__battery {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 18px;
  font-size: 12px;
  color: #2ecc71;
  font-weight: 600;
  line-height: 18px;
}

.device-card__battery.is-low {
  color: #f56c6c;
}

.device-card__battery.is-good {
  color: #2ecc71;
}

.device-card__battery .iconfont {
  font-size: 14px;
  line-height: 1;
}

.device-card__name {
  margin-top: 20px;
  height: 18px;
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-card__body {
  margin-top: 15px;
  width: 141px;
  height: 151px;
  flex-shrink: 0;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.device-card__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.device-card__ports {
  margin-top: 22px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40px;
  flex-shrink: 0;
}

.device-card__port {
  width: 100px;
  height: 35px;
  border-radius: 16.78px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 0 12px;
  box-sizing: border-box;
  gap: 6px;
}

.device-card__port.is-open {
  background: #00c970;
  color: #fff;
}

.device-card__port.is-closed {
  background: #ff2f30;
  color: #fff;
}

.device-card__port.is-muted {
  background: #e9ecf0;
  color: #a8abb2;
}

.device-card__port-pct {
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  font-weight: bold;
  line-height: 1;
  color: inherit;
  white-space: nowrap;
}

.device-card__port-name {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 12px;
  font-weight: bold;
  line-height: 1;
}

.device-card__port.is-open .device-card__port-name {
  color: #00c970;
}

.device-card__port.is-closed .device-card__port-name {
  color: #ff2f30;
}

.device-card__port.is-muted .device-card__port-name {
  background: #f5f6f8;
  color: #a8abb2;
}

.device-card__port:nth-child(2) {
  padding: 0 12px 0 6px;
}

.device-card.is-offline .device-card__name {
  color: #909399;
}

.device-card__mask {
  position: absolute;
  inset: 0;
  background: rgba(48, 49, 51, 0.55);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
}

.device-card__action {
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: 15px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.device-card__action.is-edit {
  background: #fff;
  color: #303133;
}

.device-card__action.is-delete {
  background: #f56c6c;
  color: #fff;
}

.device-card__action .iconfont {
  font-size: 14px;
}

.device-land-menu {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
}

.device-land-menu__item {
  border: none;
  background: transparent;
  height: 40px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #303133;
  cursor: pointer;
  text-align: left;
}

.device-land-menu__item:hover {
  background: #f5f7fa;
}

.device-land-menu__item.is-danger {
  color: #f56c6c;
}

.device-land-menu__item .iconfont {
  font-size: 16px;
}
</style>
