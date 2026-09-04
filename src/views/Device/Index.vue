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
      <div class="device-page-header">
        <div class="device-page-header__row">
          <h2 class="device-page-header__title">设备列表</h2>
          <el-button
            type="primary"
            class="device-toolbar__add"
            @click.stop="onAddDevice"
          >
            <span class="device-toolbar__add-icon">+</span>
            添加新设备
          </el-button>
        </div>

        <div class="device-page-header__panel">
          <div class="device-search">
            <i
              class="iconfont icon-farm_ic_search device-search__icon"
              @click="handleSearchClick"
            ></i>
            <input
              v-model="searchText"
              class="device-search__input"
              type="text"
              placeholder="输入设备/地块名称/设备编号"
              @input="handleSearchInput"
              @keyup.enter="handleSearchClick"
            />
            <i
              v-if="searchText"
              class="iconfont icon-shanchu device-search__clear"
              @click="clearSearch"
            ></i>
          </div>

          <div class="device-filter">
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
          </div>
        </div>
      </div>

      <div class="device-scroll">
        <div
          v-for="land in visibleLandList"
          :key="land.landId"
          class="device-land"
        >
          <div class="device-land__header">
            <div class="device-land__title">
              <span class="device-land__name-text">
                {{ land.landName || '未命名地块' }}
              </span>
            </div>
            <el-popover
              v-if="land.landId != null"
              :visible="landMenuLandId === String(land.landId)"
              placement="bottom-end"
              :width="180"
              trigger="manual"
              :show-arrow="false"
              popper-class="device-land-menu-popper"
              @update:visible="(v) => onLandMenuVisible(land, v)"
            >
              <template #reference>
                <button
                  type="button"
                  class="device-land__more"
                  :class="{ 'is-expanded': landMenuLandId === String(land.landId) }"
                  @click.stop="toggleLandMenu(land)"
                >
                  <span class="device-land__more-text">更多</span>
                  <el-icon class="device-land__more-icon"><ArrowDown /></el-icon>
                </button>
              </template>
              <div class="device-land-menu" @click.stop>
                <button
                  type="button"
                  class="device-land-menu__item device-land-menu__item--divider"
                  @click.stop="onEditLand(land)"
                >
                  <img
                    class="device-land-menu__icon-img"
                    :src="landMenuEditIcon"
                    alt=""
                  />
                  编辑地块
                </button>
                <button
                  type="button"
                  class="device-land-menu__item"
                  @click.stop="onSortLand(land)"
                >
                  <img
                    class="device-land-menu__icon-img"
                    :src="landMenuSortIcon"
                    alt=""
                  />
                  阀门排序
                </button>
                <button
                  type="button"
                  class="device-land-menu__item is-danger"
                  @click.stop="onDeleteLand(land)"
                >
                  <img
                    class="device-land-menu__icon-img"
                    :src="landMenuDeleteIcon"
                    alt=""
                  />
                  删除地块
                </button>
              </div>
            </el-popover>
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
              v-for="device in getVisibleDevices(land)"
              :key="device.id"
              class="device-card"
              :class="{
                'is-offline': !device.isOnline,
                'is-action': actionDeviceId === String(device.id)
              }"
              @click.stop="onDeviceClick(device)"
              @pointerdown="onDevicePointerDown($event, device)"
              @pointermove="onDevicePointerMove"
              @pointerup="onDevicePointerUp"
              @pointerleave="onDevicePointerUp"
              @pointercancel="onDevicePointerUp"
              @contextmenu.prevent="onDeviceLongPress(device)"
            >
              <div class="device-card__top">
                <div class="device-card__info">
                  <div class="device-card__name">
                    {{ device.name || '未命名设备' }}
                  </div>
                  <span
                    class="device-card__status"
                    :class="device.isOnline ? 'is-online' : 'is-offline'"
                  >
                    <i class="device-card__status-dot"></i>
                    {{ getOnlineText(device) }}
                  </span>
                </div>
                <div class="device-card__top-right">
                  <i
                    v-if="isManualMode(device)"
                    class="iconfont icon-a-lujing1 device-card__manual"
                    title="手动模式"
                  ></i>
                  <i
                    v-if="isDvAlarm(device.id)"
                    class="iconfont icon-lujing-1 device-card__alarm"
                    title="告警中"
                  ></i>
                  <i
                    v-if="isTimerRunning(device)"
                    class="iconfont icon-ic_lun_cook device-card__timer"
                    title="定时运行中"
                  ></i>
                  <span
                    v-if="device.batteryPercent != null"
                    class="device-card__battery"
                    :class="[
                      batteryClass(device.batteryPercent),
                      {
                        'is-charging': isCharging(device),
                        'is-zero': Number(device.batteryPercent) === 0
                      }
                    ]"
                  >
                    {{ batteryText(device) }}
                    <i
                      class="iconfont icon-device_ic_battery device-card__battery-icon"
                    ></i>
                  </span>
                </div>
              </div>

              <div class="device-card__body">
                <img
                  class="device-card__img"
                  :src="device.isOnline ? outletOnlineImg : outletOfflineImg"
                  alt=""
                />
              </div>

              <div
                v-if="hasWaterPile(device)"
                class="device-card__ports"
                :class="{ 'is-valve-busy': isValveBusy(device) }"
                @click.stop
              >
                <div
                  v-if="portA(device)"
                  class="device-card__port-switch"
                  :class="[
                    portSwitchClass(device, portA(device)),
                    { 'is-blink': isValveBusy(device) }
                  ]"
                >
                  <el-switch
                    :model-value="isPortOpen(portA(device))"
                    :disabled="isPortSwitchDisabled(device)"
                    inline-prompt
                    :active-text="`${portOpenText(portA(device))}%`"
                    inactive-text="关"
                    active-color="#00c970"
                    inactive-color="#ff2f30"
                    @change="(val) => onPortSwitch(device, portA(device), val)"
                  />
                  <span class="device-card__port-badge">
                    {{ portLabel(portA(device), 'A') }}
                  </span>
                </div>
                <div
                  v-if="portB(device)"
                  class="device-card__port-switch"
                  :class="[
                    portSwitchClass(device, portB(device)),
                    { 'is-blink': isValveBusy(device) }
                  ]"
                >
                  <el-switch
                    :model-value="isPortOpen(portB(device))"
                    :disabled="isPortSwitchDisabled(device)"
                    inline-prompt
                    :active-text="`${portOpenText(portB(device))}%`"
                    inactive-text="关"
                    active-color="#00c970"
                    inactive-color="#ff2f30"
                    @change="(val) => onPortSwitch(device, portB(device), val)"
                  />
                  <span class="device-card__port-badge">
                    {{ portLabel(portB(device), 'B') }}
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

    <DeviceLandSortDialog
      v-model="sortDialogVisible"
      :farm-id="getFarmId()"
      :land-id="sortLandId"
      @saved="onSortSaved"
    />

    <LandEmptyDialog
      v-model="landEmptyVisible"
      @create="onCreateLandFromEmpty"
    />

    <el-dialog
      v-model="landDeleteConfirmVisible"
      title="提示"
      width="420px"
      append-to-body
      align-center
      :close-on-click-modal="false"
      class="land-delete-confirm-dialog"
      @closed="onLandDeleteConfirmClosed"
    >
      <p class="device-land-delete-desc">
        删除地块后不能恢复，是否继续？
      </p>
      <el-checkbox v-model="landDeleteRiskChecked">
        已知晓风险，确认删除。
      </el-checkbox>
      <template #footer>
        <el-button class="land-delete-confirm-dialog__btn" @click="landDeleteConfirmVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          class="land-delete-confirm-dialog__btn is-confirm"
          :disabled="!landDeleteRiskChecked"
          :loading="landDeleting"
          @click="confirmDeleteLand"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 对齐移动端 a-tip-sure：删除设备风险确认 -->
    <el-dialog
      v-model="deviceDeleteConfirmVisible"
      title="提示"
      width="420px"
      append-to-body
      :close-on-click-modal="false"
      class="device-delete-confirm-dialog"
      @closed="onDeviceDeleteConfirmClosed"
    >
      <p class="device-land-delete-desc">
        删除后不能操作该设备，是否继续？
      </p>
      <el-checkbox v-model="deviceDeleteRiskChecked">
        已知晓风险，确定要删除。
      </el-checkbox>
      <template #footer>
        <el-button @click="deviceDeleteConfirmVisible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="!deviceDeleteRiskChecked"
          :loading="deviceDeleting"
          @click="confirmDeleteDevice"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElSwitch } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import landMenuEditIcon from '@/assets/device/land-menu-edit.svg'
import landMenuSortIcon from '@/assets/device/land-menu-sort.svg'
import landMenuDeleteIcon from '@/assets/device/land-menu-delete.svg'
import { useFarmStore } from '@/store/farm'
import { useAlarmStore } from '@/store/alarm'
import { deleteDevice, getDeviceGroupByLands, getWaterOutletRunning } from '@/api/device'
import { deleteLand, getLandPlotById } from '@/api/map'
import { useWaterOutletValve } from '@/composables/useWaterOutletValve'
import {
  initDeviceLandListPorts,
  isPortOpen,
  mergeDeviceLandList,
  setOpenStatusOnList
} from '@/utils/waterOutletMerge'
import DeviceLandSortDialog from './DeviceLandSortDialog.vue'
import LandEmptyDialog from '@/views/Map/LandEmptyDialog.vue'
import outletOnlineImg from '@/assets/map/outlet-device-online.svg'
import outletOfflineImg from '@/assets/map/outlet-device-offline.svg'

const router = useRouter()
const farmStore = useFarmStore()
const alarmStore = useAlarmStore()
const {
  controlWaterOutletList,
  isLockControl,
  handleSwitchChange,
  resetControlState
} = useWaterOutletValve()

/** 对齐移动端 setAlarmStatus / isAlarming */
function isDvAlarm(deviceId) {
  return alarmStore.isDvAlarm(deviceId)
}

const deviceLandList = ref(null)
const loading = ref(false)
const tabIndex = ref(0)
const searchText = ref('')
/** 实际请求参数，对齐移动端 searchTextCache（仅点击搜索/清空时更新） */
const searchTextCache = ref('')
/** 是否处于搜索态，对齐移动端 isSearch（控制空态展示） */
const isSearch = ref(false)
const actionDeviceId = ref(null)
const landMenuLandId = ref(null)
const sortDialogVisible = ref(false)
const sortLandId = ref(null)
const landDeleteConfirmVisible = ref(false)
const landDeleteRiskChecked = ref(false)
const landDeleting = ref(false)
const pendingDeleteLand = ref(null)
const deviceDeleteConfirmVisible = ref(false)
const deviceDeleteRiskChecked = ref(false)
const deviceDeleting = ref(false)
const pendingDeleteDevice = ref(null)
const landEmptyVisible = ref(false)


const POLL_MS = 3000
const TIMER_POLL_MS = 15000
const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_PX = 10
let pollTimer = null
let runningPollTimer = null
let listRequestId = 0
let offFarmChange = null
let offDeviceMsg = null
let longPressTimer = null
let longPressTriggered = false
let longPressStartX = 0
let longPressStartY = 0
let longPressMoved = false

const timerRunningDevice = ref([])

const counts = computed(() => {
  let total = 0
  let online = 0
  let offline = 0
  let lowPower = 0
  let openCount = 0
  let closeCount = 0
  const list = deviceLandList.value || []
  list.forEach((land) => {
    ;(land.devices || []).forEach((dev) => {
      total += 1
      if (dev.isOnline) online += 1
      else offline += 1
      if (isLowPower(dev)) lowPower += 1
      if (isDeviceOpen(dev)) openCount += 1
      else closeCount += 1
    })
  })
  return { total, online, offline, lowPower, openCount, closeCount }
})

const tabList = computed(() => [
  { key: 'all', label: `全部(${counts.value.total})` },
  { key: 'online', label: `在线(${counts.value.online})` },
  { key: 'offline', label: `离线(${counts.value.offline})` },
  { key: 'lowPower', label: `低电量(${counts.value.lowPower})` },
  { key: 'open', label: `已打开(${counts.value.openCount})` },
  { key: 'close', label: `已关闭(${counts.value.closeCount})` }
])

/** 无任何设备且非搜索态 → 空态（对齐移动端 DeviceEmpty 条件） */
const showEmpty = computed(() => {
  if (!deviceLandList.value) return false
  if (isSearch.value || searchText.value !== '') return false
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

const isLowPower = (dev) => {
  const bat = dev?.batteryPercent
  return bat == null || Number(bat) <= 40
}

const isDeviceOpen = (dev) => {
  const ports = dev?.specificData?.waterOutletPile?.ports
  if (!Array.isArray(ports) || !ports.length) return false
  return ports.some((p) => Number(p.currentOpening) > 0)
}

const hasWaterPile = (device) => !!device?.specificData?.waterOutletPile

const isValveBusy = (device) =>
  Number(device?.specificData?.waterOutletPile?.valveAction) !== 0

const isPortSwitchDisabled = (device) => {
  if (!device?.isOnline) return true
  if (isLockControl.value) return true
  return isValveBusy(device)
}

const onPortSwitch = (device, port, val) => {
  const pile = device?.specificData?.waterOutletPile
  if (!pile || !port) return
  if (val === isPortOpen(port)) return
  handleSwitchChange(deviceLandList.value, pile.id, port.id, val)
}

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

/** 对齐移动端 getOnlienText(isOnline, ds) */
const getOnlineText = (device) => {
  if (device?.isOnline) return '在线'
  const ds = Number(device?.specificData?.waterOutletPile?.ds)
  switch (ds) {
    case 1:
      return '定时关机'
    case 2:
      return '低温关机'
    case 3:
      return '低电量关机'
    case 4:
      return '本地关机'
    case 5:
      return '远程关机'
    default:
      return '离线'
  }
}

/** 对齐移动端卡片 ds==9 手动模式图标 */
const isManualMode = (device) =>
  Number(device?.specificData?.waterOutletPile?.ds) === 9

/** 对齐移动端 getIsTimer：runing 接口返回的运行中设备 */
const isTimerRunning = (device) => {
  const id = device?.id
  if (id == null) return false
  return timerRunningDevice.value.some(
    (item) => String(item.deviceId) === String(id)
  )
}

/** 对齐移动端 single-power chargingStatus==1 */
const isCharging = (device) => Number(device?.chargingStatus) === 1

const batteryText = (device) => `${device?.batteryPercent ?? 0}%`

const getVisibleDevices = (land) => {
  const devices = land?.devices || []
  if (tabIndex.value === 0) return devices
  if (tabIndex.value === 1) return devices.filter((d) => !!d.isOnline)
  if (tabIndex.value === 2) return devices.filter((d) => !d.isOnline)
  if (tabIndex.value === 3) return devices.filter((d) => isLowPower(d))
  if (tabIndex.value === 4) return devices.filter((d) => isDeviceOpen(d))
  if (tabIndex.value === 5) return devices.filter((d) => !isDeviceOpen(d))
  return devices
}

const clearDeviceAction = () => {
  actionDeviceId.value = null
  landMenuLandId.value = null
}

const onChangeTab = () => {
  clearDeviceAction()
}

/** 对齐移动端 inputBack：输入清空时以 search 模式重新拉列表 */
const handleSearchInput = () => {
  isSearch.value = false
  if (searchText.value === '') {
    fetchDeviceList({ silent: false, isSearch: true })
  }
}

/** 点击清空图标：与手动清空输入框行为一致 */
const clearSearch = () => {
  searchText.value = ''
  handleSearchInput()
}

/** 对齐移动端 farmListHttp(true,true)：点击搜索 / 回车 */
const handleSearchClick = () => {
  isSearch.value = true
  fetchDeviceList({ silent: false, isSearch: true })
}

const onLandMenuVisible = (land, visible) => {
  landMenuLandId.value = visible ? String(land.landId) : null
}

const toggleLandMenu = (land) => {
  const id = String(land.landId)
  landMenuLandId.value = landMenuLandId.value === id ? null : id
  actionDeviceId.value = null
}

const clearLongPressTimer = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

/** 对齐移动端自定义长按：500ms，移动超过 10px 取消 */
const onDevicePointerDown = (e, device) => {
  if (e.button != null && e.button !== 0) return
  longPressTriggered = false
  longPressMoved = false
  longPressStartX = e.clientX
  longPressStartY = e.clientY
  clearLongPressTimer()
  longPressTimer = setTimeout(() => {
    if (!longPressMoved) {
      longPressTriggered = true
      onDeviceLongPress(device)
    }
  }, LONG_PRESS_MS)
}

const onDevicePointerMove = (e) => {
  if (longPressMoved || !longPressTimer) return
  const dx = Math.abs(e.clientX - longPressStartX)
  const dy = Math.abs(e.clientY - longPressStartY)
  if (dx > LONG_PRESS_MOVE_PX || dy > LONG_PRESS_MOVE_PX) {
    longPressMoved = true
    clearLongPressTimer()
  }
}

const onDevicePointerUp = () => {
  clearLongPressTimer()
}

const onDeviceLongPress = (device) => {
  clearLongPressTimer()
  if (!device?.id) return
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
  if (!device?.id) return
  farmStore.setControlDevice(device)
  router.push({
    path: '/device/control',
    query: { id: String(device.id) }
  })
}

/** 添加设备：对齐移动端 device_empty / toAddDevice */
const onAddDevice = async () => {
  const farmId = getFarmId()
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    return
  }
  try {
    let info = farmStore.s_farm_info
    if (!info || info.id !== farmId) {
      info = await farmStore.fetchFarmFullInfo(farmId)
    }
    const lands = info?.lands
    if (!Array.isArray(lands) || lands.length <= 0) {
      // 对齐移动端 noLandPop → pop_polt_empty
      landEmptyVisible.value = true
      return
    }
    router.push('/device/add')
  } catch (e) {
    console.error('[Device] 添加设备前置校验失败', e)
    ElMessage.error('获取农场信息失败')
  }
}

/** 无地块提示 → 新建地块（对齐移动端 toAddLand → map-edit-plot?type=add） */
const onCreateLandFromEmpty = () => {
  landEmptyVisible.value = false
  router.push({ path: '/map/edit-plot', query: { type: 'add' } })
}

/** 编辑设备：对齐移动端 tapPopup → device_detail?id= */
const onEditDevice = (device) => {
  if (!device?.id) return
  clearDeviceAction()
  farmStore.setControlDevice(device)
  router.push({
    path: '/device/detail',
    query: { id: String(device.id) }
  })
}

/** 删除设备：对齐移动端 confirmModal → deleteDeviceHttp */
const onDeleteDevice = (device) => {
  if (!device?.id) return
  clearDeviceAction()
  pendingDeleteDevice.value = device
  deviceDeleteRiskChecked.value = false
  deviceDeleteConfirmVisible.value = true
}

const onDeviceDeleteConfirmClosed = () => {
  pendingDeleteDevice.value = null
  deviceDeleteRiskChecked.value = false
}

const confirmDeleteDevice = async () => {
  const device = pendingDeleteDevice.value
  if (!device?.id) return
  deviceDeleting.value = true
  try {
    await deleteDevice(device.id)
    ElMessage.success('操作成功')
    deviceDeleteConfirmVisible.value = false
    clearDeviceAction()
    await farmStore.fetchFarmList()
    await fetchDeviceList({ silent: false })
  } catch (e) {
    console.error('[Device] 删除设备失败', e)
    ElMessage.error(e?.message || '删除设备失败')
  } finally {
    deviceDeleting.value = false
  }
}

/** 编辑地块：对齐移动端 getLandDetailHttp → add-edit-land?type=edit */
const onEditLand = async (land) => {
  landMenuLandId.value = null
  if (land?.landId == null) return
  try {
    const res = await getLandPlotById(land.landId)
    if (res?.data) {
      farmStore.setLand(res.data)
      router.push({
        path: '/farm/edit-land',
        query: { type: 'edit', from: 'device' }
      })
    }
  } catch (e) {
    console.error('[Device] 获取地块详情失败', e)
    ElMessage.error('获取地块详情失败')
  }
}

const onSortLand = (land) => {
  landMenuLandId.value = null
  if (land?.landId == null) return
  if (!land.devices?.length) {
    ElMessage.warning('未发现设备')
    return
  }
  sortLandId.value = land.landId
  sortDialogVisible.value = true
}

const onSortSaved = async () => {
  // 对齐移动端 pop_order_device → refreshDeviceList；本页已挂载时走统一刷新入口
  farmStore.refreshDeviceList('设备排序完成')
}

/**
 * 对齐移动端 deviceMsg.refreshDeviceList → geLandDviceListHttp(false, true)
 * 仅在列表已初始化后静默全量替换，避免与 startPoll 首屏请求打架
 */
const handleDeviceMsg = (msg) => {
  if (msg?.topic !== 'refreshDeviceList') return
  if (deviceLandList.value == null) return
  fetchDeviceList({ silent: true, isSearch: true })
}

const onDeleteLand = (land) => {
  if (land?.landId == null) return
  landMenuLandId.value = null
  pendingDeleteLand.value = land
  landDeleteRiskChecked.value = false
  landDeleteConfirmVisible.value = true
}

const onLandDeleteConfirmClosed = () => {
  pendingDeleteLand.value = null
  landDeleteRiskChecked.value = false
}

const confirmDeleteLand = async () => {
  const land = pendingDeleteLand.value
  if (land?.landId == null) return
  landDeleting.value = true
  try {
    await deleteLand(land.landId)
    ElMessage.success('操作成功')
    landDeleteConfirmVisible.value = false
    await farmStore.fetchFarmList()
    await fetchDeviceList({ silent: false })
  } catch (e) {
    console.error('[Device] 删除地块失败', e)
    ElMessage.error(e?.message || '删除地块失败')
  } finally {
    landDeleting.value = false
  }
}

/**
 * 静默轮询合并（对齐移动端 mergeData + controlWaterOutletList）
 */
const mergeListAfterPoll = (oldList, newList) =>
  mergeDeviceLandList(oldList, newList, controlWaterOutletList.value)

const fetchDeviceList = async ({ silent = false, isSearch: searchAction = false } = {}) => {
  const farmId = getFarmId()
  if (farmId == null) {
    deviceLandList.value = []
    return
  }

  if (searchAction) {
    searchTextCache.value = searchText.value
  }

  const requestId = ++listRequestId
  if (!silent && deviceLandList.value == null) loading.value = true

  try {
    const res = await getDeviceGroupByLands(
      {
        farmId,
        searchText: searchTextCache.value
      },
      { silent }
    )
    if (requestId !== listRequestId) return
    const data = Array.isArray(res?.data) ? res.data : []
    if (deviceLandList.value == null || searchAction) {
      deviceLandList.value = initDeviceLandListPorts(data)
    } else {
      mergeListAfterPoll(deviceLandList.value, data)
    }
    setOpenStatusOnList(deviceLandList.value, controlWaterOutletList.value)
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

const clearRunningPoll = () => {
  if (runningPollTimer) {
    clearInterval(runningPollTimer)
    runningPollTimer = null
  }
}

/** 对齐移动端 getWaterOutetRuningHttp */
const fetchRunningDevices = async () => {
  const farmId = getFarmId()
  if (farmId == null) {
    timerRunningDevice.value = []
    return
  }
  try {
    const res = await getWaterOutletRunning({ farmId }, { silent: true })
    timerRunningDevice.value = Array.isArray(res?.data) ? res.data : []
  } catch (e) {
    console.error('[Device] 获取运行中出水桩失败', e)
  }
}

const startRunningPoll = () => {
  clearRunningPoll()
  fetchRunningDevices()
  runningPollTimer = setInterval(() => {
    fetchRunningDevices()
  }, TIMER_POLL_MS)
}

const startPoll = () => {
  clearPoll()
  fetchDeviceList({ silent: false })
  pollTimer = setInterval(() => {
    fetchDeviceList({ silent: true })
  }, POLL_MS)
  startRunningPoll()
}

const handleFarmChange = () => {
  clearDeviceAction()
  resetControlState()
  deviceLandList.value = null
  timerRunningDevice.value = []
  startPoll()
}

onMounted(() => {
  offFarmChange = farmStore.onFarmChange(handleFarmChange)
  offDeviceMsg = farmStore.onDeviceMsg(handleDeviceMsg)
  startPoll()
})

onUnmounted(() => {
  offFarmChange?.()
  offDeviceMsg?.()
  clearPoll()
  clearRunningPoll()
  clearLongPressTimer()
  resetControlState()
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
  background: #3653a0;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.device-empty__btn:hover {
  background: #2d4590;
}

.device-page-header {
  flex-shrink: 0;
  padding: 16px 20px 0;
}

.device-page-header__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.device-page-header__title {
  margin: 0;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 22px;
  font-weight: bold;
  color: #0f172a;
  line-height: 1.4;
}

.device-page-header__panel {
  height: 152px;
  border-radius: 12px;
  background: #fff;
  padding: 26px 16px 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-search {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  margin: 0;
  padding: 0 12px;
  border-radius: 6px;
  background: #f7f7f7;
  box-sizing: border-box;
}

.device-filter {
  flex-shrink: 0;
  align-self: flex-start;
  max-width: 100%;
  border-radius: 11.6px;
  background: #edf1f6;
  overflow: hidden;
}

.device-search__icon {
  font-size: 18px;
  color: #8c8c8c;
  flex-shrink: 0;
  cursor: pointer;
}

.device-search__icon:hover {
  color: #595959;
}

.device-search__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #1a1a1a;
}

.device-search__input::placeholder {
  color: #b0b0b0;
}

.device-search__clear {
  font-size: 14px;
  color: #b0b0b0;
  flex-shrink: 0;
  cursor: pointer;
}

.device-search__clear:hover {
  color: #8c8c8c;
}

.device-tabs {
  display: inline-flex;
  align-items: stretch;
  width: auto;
  max-width: 100%;
  height: 48.4px;
  box-sizing: border-box;
  padding: 5px 10px;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
}

.device-tabs :deep(.el-radio-button) {
  flex: 0 0 auto;
  min-width: 88px;
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
  padding: 0 10px !important;
  border: 0 !important;
  border-color: transparent !important;
  border-radius: 0 !important;
  outline: none !important;
  outline-offset: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 13px;
  font-weight: bold;
  line-height: 20px;
  text-align: center;
  display: flex !important;
  align-items: center;
  justify-content: center;
  letter-spacing: 0;
  color: #3653a0;
  vertical-align: middle;
  white-space: nowrap;
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
  border-radius: 7px !important;
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
  border-radius: 7px !important;
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
  padding: 16px 20px 24px;
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

.device-land__name-text {
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 20px;
  font-weight: bold;
  line-height: 40px;
  color: #0f172a;
}

.device-land__name-text {
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 20px;
  font-weight: bold;
  line-height: 40px;
  color: #0f172a;
}

.device-land-delete-desc {
  margin: 0 0 16px;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.device-card__info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.device-card__top-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.device-card__alarm {
  font-size: 14px;
  color: #ef4444;
  line-height: 1;
}

.device-card__manual {
  font-size: 14px;
  color: #ef4444;
  line-height: 1;
}

.device-card__timer {
  font-size: 14px;
  color: #3653a0;
  line-height: 1;
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
  gap: 4px;
  flex-shrink: 0;
  height: 18px;
  font-size: 12px;
  color: #2ecc71;
  font-weight: 600;
  line-height: 12px;
}

.device-card__battery.is-low {
  color: #f56c6c;
}

.device-card__battery.is-zero {
  color: #ef4444;
}

.device-card__battery.is-zero .device-card__battery-icon {
  color: #ef4444;
}

.device-card__battery.is-good {
  color: #2ecc71;
}

.device-card__battery.is-charging {
  color: #2f6bff;
}

.device-card__battery-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  width: 14px;
  height: 12px;
  font-size: 12px !important;
  line-height: 1;
  vertical-align: middle;
  color: inherit;
  overflow: visible;
}

.device-card__name {
  width: 100%;
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
  margin-top: 12px;
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
  gap: 24px;
  flex-shrink: 0;
}

/*
 * 开关尺寸用父级 CSS 变量定义（会走 pxtorem），
 * 再传给 :deep(.el-*) —— 后者因 selectorBlackList 不会转 rem，
 * 大屏下圆钮与轨道才会同比例缩放，避免圆钮溢出轨道。
 */
.device-card__port-switch {
  --port-switch-h: 35px;
  --port-switch-inset: 2px;
  --port-switch-knob: calc(var(--port-switch-h) - var(--port-switch-inset) * 2);
  --port-switch-min-w: 100px;
  --port-switch-pad: calc(var(--port-switch-knob) + 7px);
  position: relative;
  display: inline-flex;
  align-items: center;
}

.device-card__port-switch :deep(.el-switch) {
  --el-switch-on-color: #00c970;
  --el-switch-off-color: #ff2f30;
  height: var(--port-switch-h);
}

.device-card__port-switch :deep(.el-switch__core) {
  min-width: var(--port-switch-min-w);
  height: var(--port-switch-h);
  border-radius: calc(var(--port-switch-h) / 2);
  box-sizing: border-box;
}

/* 隐藏原生滑块，改用自定义 A/B 白色圆 */
.device-card__port-switch :deep(.el-switch__action) {
  width: var(--port-switch-knob);
  height: var(--port-switch-knob);
  opacity: 0;
}

.device-card__port-switch:first-child :deep(.el-switch__core) {
  padding-left: var(--port-switch-pad);
}

.device-card__port-switch:nth-child(2) :deep(.el-switch__core) {
  padding-right: var(--port-switch-pad);
}

.device-card__port-switch.is-muted :deep(.el-switch.is-disabled .el-switch__core) {
  background: #e9ecf0 !important;
  border-color: #e9ecf0 !important;
}

.device-card__port-badge {
  position: absolute;
  top: 50%;
  z-index: 2;
  transform: translateY(-50%);
  width: var(--port-switch-knob);
  height: var(--port-switch-knob);
  border-radius: 50%;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  font-weight: bold;
  line-height: 1;
  color: #3653a0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  pointer-events: none;
  flex-shrink: 0;
  box-sizing: border-box;
}

.device-card__port-switch:first-child .device-card__port-badge {
  left: var(--port-switch-inset);
}

.device-card__port-switch:nth-child(2) .device-card__port-badge {
  right: var(--port-switch-inset);
}

.device-card__port-switch.is-open .device-card__port-badge {
  color: #00c970;
}

.device-card__port-switch.is-closed .device-card__port-badge {
  color: #ff2f30;
}

.device-card__port-switch.is-muted .device-card__port-badge {
  background: #f5f6f8;
  color: #a8abb2;
  box-shadow: none;
}

.device-card__ports.is-valve-busy .device-card__port-switch.is-blink :deep(.el-switch__core) {
  animation: device-valve-blink 1s ease-in-out infinite;
}

@keyframes device-valve-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

.device-card.is-offline {
  filter: grayscale(100%);
  opacity: 0.65;
}

.device-card.is-offline .device-card__ports {
  pointer-events: none;
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
  padding: 6px 0;
}

.device-land-menu__item {
  border: none;
  background: transparent;
  height: 44px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  cursor: pointer;
  text-align: left;
  border-radius: 8px;
}

.device-land-menu__item--divider {
  margin-bottom: 4px;
  position: relative;
}

.device-land-menu__item--divider::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: -2px;
  height: 1px;
  background: #edf1f7;
}

.device-land-menu__item:hover {
  background: #f5f7fa;
}

.device-land-menu__item.is-danger {
  color: #f56c6c;
}

.device-land-menu__item .iconfont,
.device-land-menu__item .device-land-menu__icon-img {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.device-land-menu__item .iconfont {
  font-size: 16px;
  color: #3653a0;
}

.device-land-menu__item.is-danger .iconfont {
  color: #f56c6c;
}
</style>

<style>
.device-land-menu-popper.el-popover.el-popper {
  padding: 8px 0 !important;
  border: none !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12) !important;
}

/* iconfont 全局 16px，电量图标单独缩放至与 12px 文字同高 */
.device-card__battery .device-card__battery-icon.iconfont {
  font-size: 12px !important;
  line-height: 1 !important;
}

.device-card__battery .device-card__battery-icon.iconfont::before {
  display: block;
  font-size: 12px !important;
  line-height: 1 !important;
  transform: scale(0.72);
  transform-origin: left center;
}

.land-delete-confirm-dialog.el-dialog {
  border-radius: 20px;
  overflow: hidden;
}

.land-delete-confirm-dialog .el-dialog__header {
  margin-right: 0;
  padding: 24px 28px 12px;
  text-align: center;
}

.land-delete-confirm-dialog .el-dialog__title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.4;
}

.land-delete-confirm-dialog .el-dialog__headerbtn {
  top: 20px;
}

.land-delete-confirm-dialog .el-dialog__body {
  padding: 0 28px 8px;
}

.land-delete-confirm-dialog .el-dialog__footer {
  padding: 8px 28px 24px;
}

.land-delete-confirm-dialog .device-land-delete-desc {
  margin: 0 0 16px;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.land-delete-confirm-dialog .el-checkbox {
  --el-checkbox-checked-bg-color: #3653a0;
  --el-checkbox-checked-input-border-color: #3653a0;
  height: auto;
}

.land-delete-confirm-dialog .el-checkbox__label {
  font-size: 14px;
  color: #909399;
  line-height: 1.4;
}

.land-delete-confirm-dialog .land-delete-confirm-dialog__btn {
  min-width: 88px;
  height: 40px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.land-delete-confirm-dialog .land-delete-confirm-dialog__btn.is-confirm {
  --el-button-bg-color: #274082;
  --el-button-border-color: #274082;
  --el-button-hover-bg-color: #1f3468;
  --el-button-hover-border-color: #1f3468;
  --el-button-active-bg-color: #1f3468;
  --el-button-active-border-color: #1f3468;
}

.device-delete-confirm-dialog.el-dialog {
  border-radius: 20px;
  overflow: hidden;
}

.device-delete-confirm-dialog .el-dialog__header {
  margin-right: 0;
  padding: 24px 28px 12px;
  text-align: center;
}

.device-delete-confirm-dialog .el-dialog__title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.4;
}

.device-delete-confirm-dialog .el-dialog__body {
  padding: 0 28px 8px;
}

.device-delete-confirm-dialog .el-dialog__footer {
  padding: 8px 28px 24px;
}

.device-delete-confirm-dialog .device-land-delete-desc {
  margin: 0 0 16px;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.device-delete-confirm-dialog .el-checkbox {
  --el-checkbox-checked-bg-color: #3653a0;
  --el-checkbox-checked-input-border-color: #3653a0;
  height: auto;
}

.device-delete-confirm-dialog .el-checkbox__label {
  font-size: 14px;
  color: #909399;
  line-height: 1.4;
}

.device-delete-confirm-dialog .el-dialog__footer .el-button {
  min-width: 88px;
  height: 40px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.device-delete-confirm-dialog .el-dialog__footer .el-button:not(.el-button--primary) {
  border: 1px solid #dcdfe6;
  background: #fff;
  color: #303133;
}

.device-delete-confirm-dialog .el-dialog__footer .el-button:not(.el-button--primary):hover {
  border-color: #c0c4cc;
  color: #1a1a1a;
  background: #fff;
}

.device-delete-confirm-dialog .el-dialog__footer .el-button--primary {
  --el-button-bg-color: #274082;
  --el-button-border-color: #274082;
  --el-button-hover-bg-color: #1f3468;
  --el-button-hover-border-color: #1f3468;
  --el-button-active-bg-color: #1f3468;
  --el-button-active-border-color: #1f3468;
  --el-button-disabled-bg-color: #a8b4d4;
  --el-button-disabled-border-color: #a8b4d4;
}
</style>
