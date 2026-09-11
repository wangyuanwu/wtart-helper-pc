<template>
  <div class="device-detail" v-loading="pageLoading">
    <div class="device-detail__header">
      <div class="device-detail__head-left">
        <button type="button" class="device-detail__back" @click="onBack">
          ← 返回
        </button>
        <h2 class="device-detail__title">出水桩设置</h2>
      </div>
      <div class="device-detail__actions">
        <el-button class="device-detail__btn-delete" :loading="deleting" @click="onDelete">
          删除设备
        </el-button>
        <el-button type="primary" class="device-detail__btn-save" :loading="saving" @click="onSave">
          保存
        </el-button>
      </div>
    </div>

    <div v-if="deviceInfo" class="device-detail__grid">
      <div class="device-detail__row device-detail__row--top">
      <!-- 设备信息 -->
      <section class="device-detail__card device-detail__card--info">
        <div class="device-detail__card-head">
          <span class="device-detail__card-icon-wrap">
            <img class="device-detail__card-icon" :src="icInfo" alt="" />
          </span>
          <span>设备信息</span>
        </div>

        <div class="device-detail__form">
          <div class="device-detail__field">
            <label>出水桩名称</label>
            <el-input
              v-model="deviceInfo.name"
              placeholder="请输入出水桩名称"
              clearable
              class="device-detail__input"
            />
          </div>
          <div class="device-detail__field">
            <label>设备朝向</label>
            <button
              type="button"
              class="device-detail__orient"
              @click="toChangeDv(1)"
            >
              <span>{{ orientationFieldText }}</span>
              <el-icon class="device-detail__orient-arrow"><ArrowDown /></el-icon>
            </button>
          </div>
          <div class="device-detail__field">
            <label>出水桩位置</label>
            <div class="device-detail__location">
              <el-input
                :model-value="locationDisplay"
                readonly
                placeholder="暂无位置"
                class="device-detail__input"
              />
              <button
                type="button"
                class="device-detail__location-btn"
                @click="toChangeDv(0)"
              >
                修改位置
              </button>
            </div>
          </div>
          <div class="device-detail__field">
            <label>所属地块</label>
            <el-input
              :model-value="deviceInfo.landName || '--'"
              readonly
              class="device-detail__input"
            />
          </div>
        </div>
      </section>

      <!-- 网络信息 -->
      <section class="device-detail__card">
        <div class="device-detail__card-head">
          <span class="device-detail__card-icon-wrap">
            <img class="device-detail__card-icon" :src="icNetwork" alt="" />
          </span>
          <span>网络信息</span>
        </div>
        <div v-if="otherInfo" class="device-detail__kv-list">
          <div class="device-detail__kv">
            <span class="device-detail__kv-label">设备ID</span>
            <span
              class="device-detail__kv-value is-copy"
              title="点击复制"
              @click="copyText(otherInfo.deviceCode)"
            >
              {{ otherInfo.deviceCode || '--' }}
            </span>
          </div>
          <div class="device-detail__kv">
            <span class="device-detail__kv-label">激活时间</span>
            <span class="device-detail__kv-value">
              {{ formatUtc(otherInfo.activationTimeUtc) }}
            </span>
          </div>
          <div class="device-detail__kv">
            <span class="device-detail__kv-label">网络状态</span>
            <div class="device-detail__signal">
              <div class="device-detail__signal-bars" aria-hidden="true">
                <span
                  v-for="i in 5"
                  :key="i"
                  class="device-detail__signal-bar"
                  :class="{ 'is-active': signalLevel >= i }"
                  :style="{ height: `${20 + i * 10}%` }"
                ></span>
              </div>
              <span class="device-detail__signal-text">{{ signalStatusText }}</span>
            </div>
          </div>
          <div class="device-detail__kv">
            <span class="device-detail__kv-label">运营商</span>
            <span class="device-detail__kv-value">{{ operatorText }}</span>
          </div>
          <div class="device-detail__kv">
            <span class="device-detail__kv-label">网卡编号</span>
            <span
              class="device-detail__kv-value is-copy"
              title="点击复制"
              @click="copyText(otherInfo.iccid)"
            >
              {{ otherInfo.iccid || '--' }}
            </span>
          </div>
          <div v-if="cardInfo" class="device-detail__kv">
            <span class="device-detail__kv-label">网卡到期时间</span>
            <span class="device-detail__kv-value">
              {{ formatUtc(cardInfo.expiryDate) }}
            </span>
          </div>
          <div v-if="cardInfo" class="device-detail__kv">
            <span class="device-detail__kv-label">总流量</span>
            <span class="device-detail__kv-value">
              {{ cardInfo.trafficAmount }}MB
            </span>
          </div>
          <div v-if="cardInfo" class="device-detail__kv">
            <span class="device-detail__kv-label">剩余流量</span>
            <div class="device-detail__kv-value-group">
              <span class="device-detail__kv-value">
                {{ cardInfo.leftFlow }}MB
              </span>
              <button
                type="button"
                class="device-detail__recharge-btn"
                @click="onNetCardRecharge"
              >
                立即充值
              </button>
            </div>
          </div>
          <div class="device-detail__kv">
            <span class="device-detail__kv-label">软件版本</span>
            <span class="device-detail__version-badge">
              {{ softwareVersionText }}
            </span>
          </div>
        </div>
        <div v-else class="device-detail__empty">暂无网络数据</div>
      </section>
      </div>

      <div class="device-detail__row device-detail__row--bottom">
      <!-- 设备数据 -->
      <section class="device-detail__card device-detail__card--data">
        <div class="device-detail__card-head">
          <span class="device-detail__card-icon-wrap">
            <img class="device-detail__card-icon" :src="icData" alt="" />
          </span>
          <span>设备数据</span>
          <span v-if="syncTime" class="device-detail__sync-time">
            上次同步：{{ syncTime }}
          </span>
          <button
            type="button"
            class="device-detail__sync-pill"
            :disabled="syncing"
            @click="fetchOtherData({ toast: true })"
          >
            {{ syncing ? '同步中…' : '立即同步' }}
          </button>
        </div>

        <div v-if="otherInfo" class="device-detail__data">
          <div
            class="device-detail__battery"
            :class="{ 'is-accent': selectedMetric === 'BatteryPercent' }"
          >
            <button
              type="button"
              class="device-detail__battery-left"
              @click="openChart('BatteryPercent')"
            >
              <span class="device-detail__battery-label-row">
                <span class="device-detail__battery-label">电池电量</span>
                <span class="device-detail__chart-badge" aria-hidden="true">
                  <img :src="icChartPath" alt="" />
                </span>
              </span>
              <span class="device-detail__battery-value">
                <strong>{{ batteryPercent }}</strong>
                <em>%</em>
              </span>
            </button>
            <div class="device-detail__battery-right">
              <span class="device-detail__charge-text">{{ chargingText }}</span>
              <span
                class="device-detail__charge-icon"
                :class="isCharging ? 'is-charging' : 'is-idle'"
                :style="{
                  WebkitMaskImage: `url(${icChargeStatus})`,
                  maskImage: `url(${icChargeStatus})`
                }"
                aria-hidden="true"
              ></span>
            </div>
          </div>

          <div class="device-detail__metrics">
            <button
              type="button"
              class="device-detail__metric"
              :class="{ 'is-accent': selectedMetric === 'SolarPanelVoltage' }"
              @click="openChart('SolarPanelVoltage')"
            >
              <div class="device-detail__metric-label">
                <span>太阳能板电压</span>
                <span class="device-detail__chart-badge" aria-hidden="true">
                  <img :src="icChartPath" alt="" />
                </span>
              </div>
              <div class="device-detail__metric-value">
                {{ solarVoltageText }}
                <em>V</em>
              </div>
            </button>
            <button
              type="button"
              class="device-detail__metric"
              :class="{ 'is-accent': selectedMetric === 'ChargingCurrent' }"
              @click="openChart('ChargingCurrent')"
            >
              <div class="device-detail__metric-label">
                <span>充电电流</span>
                <span class="device-detail__chart-badge" aria-hidden="true">
                  <img :src="icChartPath" alt="" />
                </span>
              </div>
              <div class="device-detail__metric-value">
                {{ chargingCurrentText }}
              </div>
            </button>
            <button
              type="button"
              class="device-detail__metric"
              :class="{ 'is-accent': selectedMetric === 'MotorCurrent' }"
              @click="openChart('MotorCurrent')"
            >
              <div class="device-detail__metric-label">
                <span>电机电流</span>
                <span class="device-detail__chart-badge" aria-hidden="true">
                  <img :src="icChartPath" alt="" />
                </span>
              </div>
              <div class="device-detail__metric-value">
                {{ motorCurrentText }}
              </div>
            </button>
          </div>
        </div>
        <div v-else class="device-detail__empty">暂无设备数据</div>
      </section>

      <!-- 设备操作 -->
      <section class="device-detail__card device-detail__card--ops">
        <div class="device-detail__card-head">
          <span class="device-detail__card-icon-wrap">
            <img class="device-detail__card-icon" :src="icOps" alt="" />
          </span>
          <span>设备操作</span>
        </div>
        <div class="device-detail__ops">
          <button type="button" class="device-detail__op" @click="onSleep">
            <span class="device-detail__op-icon is-sleep">
              <img :src="icSleep" alt="" />
            </span>
            <span>定时休眠</span>
          </button>
          <button type="button" class="device-detail__op" @click="onRestart">
            <span class="device-detail__op-icon is-restart">
              <img :src="icRestart" alt="" />
            </span>
            <span>远程重启</span>
          </button>
          <button type="button" class="device-detail__op" @click="onShutdown">
            <span class="device-detail__op-icon is-shutdown">
              <img :src="icShutdown" alt="" />
            </span>
            <span>远程关机</span>
          </button>
          <button
            type="button"
            class="device-detail__op"
            :class="{ 'is-ringing': isRing }"
            :disabled="ringLoading"
            @click="onRingToggle"
          >
            <span
              class="device-detail__op-icon"
              :class="isRing ? 'is-ring-stop' : 'is-ring'"
            >
              <el-icon :size="24"><AlarmClock /></el-icon>
            </span>
            <span>{{ isRing ? '停止响铃' : '远程响铃' }}</span>
          </button>
        </div>
      </section>
      </div>
    </div>

    <DeviceSleepDialog v-model="sleepVisible" @confirm="onSleepConfirm" />
    <DeviceChartDialog
      v-model="chartVisible"
      :device-id="deviceId"
      :field-type="chartFieldType"
    />
  </div>
</template>

<script setup>
import { computed, onActivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { AlarmClock, ArrowDown } from '@element-plus/icons-vue'
import { useFarmStore } from '@/store/farm'
import {
  closeRestartDv,
  deleteDevice,
  getDeviceDetail,
  getNetCard,
  getWaterOutletPileData,
  updateDevice
} from '@/api/device'
import {
  angleToDirection,
  OPERATOR_TYPE_LIST,
  snapOrientationAngle
} from '@/utils/deviceOrientation'
import DeviceSleepDialog from './DeviceSleepDialog.vue'
import DeviceChartDialog from './DeviceChartDialog.vue'
import icInfo from '@/assets/device/detail/ic_info.png'
import icNetwork from '@/assets/device/detail/ic_network.png'
import icData from '@/assets/device/detail/ic_data.png'
import icOps from '@/assets/device/detail/ic_ops.png'
import icSleep from '@/assets/device/detail/ic_sleep.png'
import icRestart from '@/assets/device/detail/ic_restart.png'
import icShutdown from '@/assets/device/detail/ic_shutdown.png'
import icChartPath from '@/assets/device/detail/ic_chart_path.svg'
import icChargeStatus from '@/assets/device/detail/ic_charge_status.svg'

const route = useRoute()
const router = useRouter()
const farmStore = useFarmStore()

const pageLoading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const syncing = ref(false)
const sleepVisible = ref(false)
const chartVisible = ref(false)
const chartFieldType = ref('SolarPanelVoltage')
const selectedMetric = ref('')
/** 对齐移动端 isRing：响铃中展示「停止」，60s 后自动恢复入口文案 */
const isRing = ref(false)
const ringLoading = ref(false)
let ringTimer = null

const deviceInfo = ref(null)
const otherInfo = ref(null)
const cardInfo = ref(null)
const syncTime = ref('')
const waterOutletId = ref(null)
const orientationAngle = ref(0)

const deviceId = computed(
  () => route.query.id ?? farmStore.s_control_device?.id
)

const locationDisplay = computed(() => {
  const d = deviceInfo.value
  if (!d) return ''
  if (d.address) return d.address
  if (d.longitude != null && d.latitude != null) {
    return `${d.longitude},${d.latitude}`
  }
  return ''
})

/** 对齐移动端 $System.angleToDirection(deviceInfo.orientationAngle) */
const orientationDisplay = computed(() =>
  angleToDirection(orientationAngle.value)
)

const orientationFieldText = computed(() => {
  const dir = orientationDisplay.value
  if (!dir || dir === '--') return '--'
  return `${dir} (${orientationAngle.value}°)`
})

const isOnline = computed(() => {
  if (otherInfo.value?.isOnline != null) return !!otherInfo.value.isOnline
  return !!deviceInfo.value?.isOnline
})

const operatorText = computed(() => {
  const type = otherInfo.value?.waterOutletPile?.operatorType
  if (type == null) return '--'
  return OPERATOR_TYPE_LIST[Number(type)] || '--'
})

const firmwareText = computed(() => {
  const v = otherInfo.value?.softwareVersion
  if (v == null || v === '') return '--'
  const s = String(v)
  return s.toLowerCase().startsWith('v') ? s : `v${s}`
})

/** 对齐移动端 textEmptyUnity2(..., 'V') */
const softwareVersionText = computed(() => firmwareText.value)

/** 对齐移动端 single-view getSingleBase */
const signalLevel = computed(() =>
  getSignalLevel(Number(otherInfo.value?.signal))
)

/** 对齐移动端：-37dBm(12) */
const signalStatusText = computed(() => {
  const signal = otherInfo.value?.signal
  const snr = otherInfo.value?.snr
  let text = signal == null || signal === '' ? '--' : `${signal}dBm`
  if (snr != null && snr !== '') {
    text += `(${snr})`
  }
  return text
})

const batteryPercent = computed(() => {
  const n = Number(otherInfo.value?.batteryPercent)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
})

const isCharging = computed(
  () => Number(otherInfo.value?.chargingStatus) === 1
)

const chargingText = computed(() => (isCharging.value ? '充电中' : '未充电'))

function getSignalLevel(val) {
  const sig0 = Number.isFinite(val) ? val : -105
  if (sig0 > -85) return 5
  if (sig0 > -90) return 4
  if (sig0 > -95) return 3
  if (sig0 > -100) return 2
  if (sig0 > -105) return 1
  return 0
}

function formatNum(v, digits = 2) {
  if (v == null || v === '') return '--'
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return n.toFixed(digits)
}

/** 对齐移动端 textEmptyUnity(v, unit) */
function textEmptyUnity(v, unit = '') {
  if (v == null || v === '') return '--'
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return `${n.toFixed(1)}${unit}`
}

const solarVoltageText = computed(() =>
  formatNum(otherInfo.value?.waterOutletPile?.solarPanelVoltage)
)
const chargingCurrentText = computed(() =>
  textEmptyUnity(otherInfo.value?.waterOutletPile?.chargingCurrent, 'mA')
)
const motorCurrentText = computed(() =>
  textEmptyUnity(otherInfo.value?.waterOutletPile?.motorCurrent, 'mA')
)

function formatUtc(utc) {
  if (!utc) return '--'
  const d = new Date(utc)
  if (Number.isNaN(d.getTime())) return '--'
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function nowText() {
  return formatUtc(new Date().toISOString())
}

async function copyText(text) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(String(text))
    ElMessage.success('复制成功')
  } catch {
    ElMessage.error('复制失败')
  }
}

function onNetCardRecharge() {
  ElMessageBox.alert('请前往移动端进行充值', '提示', {
    confirmButtonText: '知道了',
    type: 'info'
  }).catch(() => {})
}

function onBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/device')
}

async function loadDeviceDetail() {
  const id = deviceId.value
  if (id == null) {
    ElMessage.warning('缺少设备信息')
    router.replace('/device')
    return
  }
  pageLoading.value = true
  try {
    const res = await getDeviceDetail(id)
    deviceInfo.value = res?.data ? { ...res.data } : null
    if (deviceInfo.value) {
      orientationAngle.value = snapOrientationAngle(
        deviceInfo.value.orientationAngle
      )
      farmStore.setControlDevice(deviceInfo.value)
    }
  } catch (e) {
    console.error('[DeviceDetail] 获取设备详情失败', e)
    ElMessage.error('获取设备详情失败')
  } finally {
    pageLoading.value = false
  }
}

async function fetchNetCard(iccid) {
  if (!iccid) {
    cardInfo.value = null
    return
  }
  try {
    const res = await getNetCard(iccid, { silent: true })
    cardInfo.value = res?.data || null
  } catch (e) {
    console.error('[DeviceDetail] 获取网卡信息失败', e)
    cardInfo.value = null
  }
}

async function fetchOtherData({ toast = false } = {}) {
  const id = deviceId.value
  if (id == null) return
  syncing.value = true
  try {
    const res = await getWaterOutletPileData(id, {
      silent: !toast,
      loading: toast
    })
    otherInfo.value = res?.data || null
    waterOutletId.value = otherInfo.value?.waterOutletPile?.id ?? null
    syncTime.value = nowText()
    await fetchNetCard(otherInfo.value?.iccid)
    if (toast) ElMessage.success('操作成功')
  } catch (e) {
    console.error('[DeviceDetail] 同步设备数据失败', e)
    cardInfo.value = null
    if (toast) ElMessage.error(e?.message || '同步失败')
  } finally {
    syncing.value = false
  }
}

async function onSave() {
  if (!deviceInfo.value?.id || saving.value) return
  const name = (deviceInfo.value.name || '').trim()
  if (!name) {
    ElMessage.warning('请输入出水桩名称')
    return
  }
  saving.value = true
  try {
    await updateDevice({
      id: deviceInfo.value.id,
      name,
      address: deviceInfo.value.address,
      landId: deviceInfo.value.landId,
      longitude: deviceInfo.value.longitude,
      latitude: deviceInfo.value.latitude,
      coordinateType: deviceInfo.value.coordinateType,
      orientationAngle: orientationAngle.value
    })
    ElMessage.success('操作成功')
    await farmStore.fetchFarmList()
    farmStore.refreshDeviceList('设备信息已更新')
    setTimeout(() => router.back(), 600)
  } catch (e) {
    console.error('[DeviceDetail] 保存失败', e)
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  if (!deviceInfo.value?.id || deleting.value) return
  try {
    await ElMessageBox.confirm('请确认是否删除设备？', '删除设备', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    })
  } catch {
    return
  }
  deleting.value = true
  try {
    await deleteDevice(deviceInfo.value.id)
    ElMessage.success('操作成功')
    await farmStore.fetchFarmList()
    farmStore.refreshDeviceList('设备已删除')
    setTimeout(() => {
      router.replace('/device')
    }, 600)
  } catch (e) {
    console.error('[DeviceDetail] 删除失败', e)
    ElMessage.error(e?.message || '删除设备失败')
  } finally {
    deleting.value = false
  }
}

function setDeviceList() {
  const info = deviceInfo.value
  if (!info?.id) return []
  const online =
    otherInfo.value?.isOnline != null
      ? !!otherInfo.value.isOnline
      : !!info.isOnline
  return [
    {
      id: info.id,
      type: info.type,
      farmId: info.farmId,
      name: info.name,
      deviceCode: info.deviceCode,
      address: info.address,
      landId: info.landId,
      landName: info.landName,
      longitude: info.longitude,
      latitude: info.latitude,
      coordinateType: info.coordinateType,
      orientationAngle: info.orientationAngle,
      isOnline: online,
      specificData: info.specificData
    }
  ]
}

/** 对齐移动端 toChangeDv：写入 vuex_edit_device_map 后进地图编辑 */
function toChangeDv(code) {
  if (!deviceInfo.value?.id) {
    ElMessage.warning('缺少设备信息')
    return
  }
  const deveList = setDeviceList()
  farmStore.setEditDeviceMap(deveList)
  farmStore.setEditDevice(deveList)
  const event = code === 1 ? 'angle' : 'location'
  router.push({
    path: '/map/edit-device',
    query: { type: 'edit', event }
  })
}

/** 对齐移动端 deviceMsg editConform：地图确认后回填本地，待用户点保存落库 */
function applyPendingDeviceEdit() {
  const list = farmStore.consumePendingDeviceEdit()
  const device = Array.isArray(list) ? list[0] : null
  if (!device || !deviceInfo.value) return
  deviceInfo.value = {
    ...deviceInfo.value,
    landId: device.landId,
    landName: device.landName ?? deviceInfo.value.landName,
    longitude: device.longitude,
    latitude: device.latitude,
    address: device.address,
    orientationAngle: device.orientationAngle,
    coordinateType: device.coordinateType ?? deviceInfo.value.coordinateType
  }
  orientationAngle.value = snapOrientationAngle(device.orientationAngle)
}

function openChart(fieldType) {
  const id = deviceId.value
  if (id == null) {
    ElMessage.warning('缺少设备信息')
    return
  }
  selectedMetric.value = fieldType
  chartFieldType.value = fieldType
  chartVisible.value = true
}

function ensureWaterOutletId() {
  if (waterOutletId.value != null) return true
  ElMessage.warning('请先同步设备数据')
  return false
}

function onSleep() {
  if (!ensureWaterOutletId()) return
  sleepVisible.value = true
}

async function onSleepConfirm({ startTime, endTime }) {
  if (!ensureWaterOutletId()) return
  try {
    await closeRestartDv(
      {
        waterOutletId: waterOutletId.value,
        oper: 0,
        offt: endTime,
        ont: startTime
      },
      { loading: true }
    )
    ElMessage.success('操作成功')
  } catch (e) {
    console.error('[DeviceDetail] 定时休眠失败', e)
  }
}

async function onRestart() {
  if (!ensureWaterOutletId()) return
  try {
    await ElMessageBox.confirm(
      '重启过程中设备无法正常工作,需等待设备成功连接服务器后才可恢复。是否重启该设备?',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        customClass: 'device-op-message-box',
        confirmButtonClass: 'device-op-dialog-btn device-op-dialog-btn--confirm',
        cancelButtonClass: 'device-op-dialog-btn device-op-dialog-btn--cancel'
      }
    )
    await closeRestartDv(
      { waterOutletId: waterOutletId.value, oper: 2 },
      { loading: true }
    )
    ElMessage.success('操作成功')
  } catch (e) {
    if (e === 'cancel' || e?.message === 'cancel') return
    console.error('[DeviceDetail] 远程重启失败', e)
  }
}

async function onShutdown() {
  if (!ensureWaterOutletId()) return
  try {
    await ElMessageBox.confirm(
      '远程关机后，无法远程开启，只有手动现场开启。是否远程关机?',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        customClass: 'device-op-message-box',
        confirmButtonClass: 'device-op-dialog-btn device-op-dialog-btn--confirm',
        cancelButtonClass: 'device-op-dialog-btn device-op-dialog-btn--cancel'
      }
    )
    await closeRestartDv(
      { waterOutletId: waterOutletId.value, oper: 1 },
      { loading: true }
    )
    ElMessage.success('操作成功')
  } catch (e) {
    if (e === 'cancel' || e?.message === 'cancel') return
    console.error('[DeviceDetail] 远程关机失败', e)
  }
}

function clearRingTimer() {
  if (ringTimer) {
    clearTimeout(ringTimer)
    ringTimer = null
  }
}

/** 对齐移动端：oper=7 开始响铃，oper=8 停止；成功后 60s 自动恢复「响铃」入口 */
async function onRingToggle() {
  if (!ensureWaterOutletId() || ringLoading.value) return
  const oper = isRing.value ? 8 : 7
  ringLoading.value = true
  try {
    await closeRestartDv(
      { waterOutletId: waterOutletId.value, oper },
      { loading: true }
    )
    ElMessage.success('操作成功')
    if (oper === 7) {
      isRing.value = true
      clearRingTimer()
      ringTimer = setTimeout(() => {
        isRing.value = false
        ringTimer = null
      }, 60000)
    } else {
      isRing.value = false
      clearRingTimer()
    }
  } catch (e) {
    console.error('[DeviceDetail] 远程响铃失败', e)
  } finally {
    ringLoading.value = false
  }
}

onMounted(async () => {
  await loadDeviceDetail()
  await fetchOtherData({ toast: false })
  applyPendingDeviceEdit()
})

onActivated(() => {
  applyPendingDeviceEdit()
})

onUnmounted(() => {
  clearRingTimer()
})

watch(
  () => route.query.id,
  async (id, prev) => {
    if (id != null && String(id) !== String(prev)) {
      otherInfo.value = null
      cardInfo.value = null
      syncTime.value = ''
      isRing.value = false
      clearRingTimer()
      await loadDeviceDetail()
      await fetchOtherData({ toast: false })
    }
  }
)
</script>

<style scoped>
.device-detail {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 20px 24px 24px;
  background: #f7fafc;
  overflow: auto;
}

.device-detail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
}

.device-detail__head-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.device-detail__back {
  border: none;
  background: transparent;
  color: #3653a0;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.device-detail__title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1a3b87;
  line-height: 1.2;
}

.device-detail__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.device-detail__btn-delete {
  height: 40px;
  padding: 0 20px;
  border-radius: 999px;
  color: #f24724;
  background: #fff;
  border: 1px solid #e8ebf0;
  font-weight: 600;
}

.device-detail__btn-delete:hover {
  color: #f24724;
  background: #fff;
  border-color: #f0c2c2;
}

.device-detail__btn-save {
  height: 40px;
  padding: 0 24px;
  border-radius: 999px;
  font-weight: 600;
  --el-button-bg-color: #3653a0;
  --el-button-border-color: #3653a0;
  --el-button-hover-bg-color: #2f4a90;
  --el-button-hover-border-color: #2f4a90;
  box-shadow: 0 6px 16px rgba(54, 83, 160, 0.28);
}

.device-detail__grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.device-detail__row {
  display: grid;
  gap: 16px;
  align-items: stretch;
  width: 100%;
}

/* 上方：设备信息 / 网络信息，保持原比例 */
.device-detail__row--top {
  grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.85fr);
}

/* 下方：设备数据收短 150px，设备操作加宽 150px */
.device-detail__row--bottom {
  grid-template-columns:
    minmax(0, calc((100% - 16px) * 1.25 / 2.1 - 150px))
    minmax(300px, calc((100% - 16px) * 0.85 / 2.1 + 150px));
}

.device-detail__card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  padding: 18px 20px 20px;
  box-sizing: border-box;
  min-width: 0;
}

.device-detail__card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.device-detail__card-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e1efee;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.device-detail__card-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.device-detail__sync-time {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #909399;
}

.device-detail__sync-btn {
  margin-left: auto;
  font-weight: 600;
}

.device-detail__sync-pill {
  margin-left: auto;
  height: 32px;
  padding: 0 16px;
  border: 1px solid #d8dee8;
  border-radius: 999px;
  background: #fff;
  color: #3653a0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.device-detail__sync-pill:hover:not(:disabled) {
  border-color: #3653a0;
  background: rgba(54, 83, 160, 0.04);
}

.device-detail__sync-pill:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.device-detail__card--info {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.device-detail__card--info .device-detail__card-head {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.device-detail__card--data {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.device-detail__card--data .device-detail__card-head {
  flex-shrink: 0;
}

.device-detail__card--data .device-detail__data {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

.device-detail__card--ops {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  height: 100%;
}

.device-detail__card--ops .device-detail__card-head {
  flex-shrink: 0;
}

.device-detail__card--ops .device-detail__ops {
  flex: 1;
  min-height: 0;
}

.device-detail__form {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 280px;
}

.device-detail__field {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}

.device-detail__field label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

.device-detail__card--info :deep(.device-detail__input .el-input__wrapper) {
  border-radius: 999px;
  box-shadow: 0 0 0 1px #e8ebf0 inset;
  background: #fff;
  height: 44px;
  padding: 0 18px;
}

.device-detail__card--info :deep(.device-detail__input .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #3653a0 inset;
}

.device-detail__card--info :deep(.device-detail__input .el-input__inner) {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.device-detail__card--info :deep(.device-detail__input .el-input__inner::placeholder) {
  font-weight: 500;
  color: #c0c4cc;
}

.device-detail__location {
  display: flex;
  align-items: center;
  gap: 10px;
}

.device-detail__location .device-detail__input {
  flex: 1;
  min-width: 0;
}

.device-detail__location-btn {
  flex-shrink: 0;
  height: 44px;
  padding: 0 18px;
  border: none;
  border-radius: 999px;
  background: rgba(54, 83, 160, 0.12);
  color: #3653a0;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.device-detail__location-btn:hover {
  background: rgba(54, 83, 160, 0.18);
}

.device-detail__orient {
  width: 100%;
  height: 44px;
  padding: 0 18px;
  border: 1px solid #e8ebf0;
  border-radius: 999px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  cursor: pointer;
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
  text-align: left;
}

.device-detail__orient:hover {
  border-color: #3653a0;
}

.device-detail__orient-arrow {
  font-size: 14px;
  color: #94a3b8;
  flex-shrink: 0;
}

.device-detail__kv-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.device-detail__kv {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 28px;
}

.device-detail__kv-label {
  font-size: 13px;
  color: #909399;
  flex-shrink: 0;
}

.device-detail__kv-value {
  font-size: 14px;
  color: #303133;
  text-align: right;
  word-break: break-all;
}

.device-detail__kv-value-group {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.device-detail__recharge-btn {
  height: 26px;
  padding: 0 12px;
  border: none;
  border-radius: 999px;
  background: #3653a0;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.device-detail__recharge-btn:hover {
  background: #2f4a90;
}

.device-detail__kv-value.is-copy {
  cursor: pointer;
  color: #3653a0;
}

.device-detail__signal {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.device-detail__signal-bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  width: 24px;
  height: 12px;
  flex-shrink: 0;
}

.device-detail__signal-bar {
  width: 3px;
  flex: none;
  border-radius: 1px;
  background: #dcdfe6;
}

.device-detail__signal-bar.is-active {
  background: #303133;
}

.device-detail__signal-text {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  line-height: 1;
  white-space: nowrap;
}

.device-detail__version-badge {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 13px;
  background: #eef1f6;
  color: #606266;
  font-size: 12px;
  font-weight: 600;
}

.device-detail__empty {
  padding: 24px 0;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.device-detail__chart-badge {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: #3653a0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.device-detail__chart-badge img {
  width: 10px;
  height: 9px;
  display: block;
}

.device-detail__battery {
  flex: 1;
  min-height: 120px;
  padding: 18px 20px;
  border-radius: 14px;
  background: #f5f7fa;
  border: 1px solid transparent;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.device-detail__battery.is-accent {
  background: rgba(54, 83, 160, 0.05);
  border-color: rgba(54, 83, 160, 0.12);
}

.device-detail__battery-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.device-detail__battery-label-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.device-detail__battery-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.device-detail__battery-value {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  line-height: 1;
}

.device-detail__battery-value strong {
  font-size: 48px;
  font-weight: 700;
  color: #3653a0;
}

.device-detail__battery-value em {
  font-style: normal;
  font-size: 20px;
  font-weight: 600;
  color: #7a92c7;
}

.device-detail__battery-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.device-detail__charge-text {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  line-height: 1;
}

.device-detail__charge-icon {
  width: 28px;
  height: 18px;
  display: inline-block;
  background-color: #f24724;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
}

.device-detail__charge-icon.is-charging {
  background-color: #12b97e;
}

.device-detail__charge-icon.is-idle {
  background-color: #f24724;
}

.device-detail__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  flex-shrink: 0;
}

.device-detail__metric {
  position: relative;
  min-height: 108px;
  padding: 16px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
  overflow: hidden;
  border: 1px solid #edf1f7;
  text-align: left;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  color: #303133;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.device-detail__metric:hover,
.device-detail__metric.is-accent {
  background: rgba(54, 83, 160, 0.05);
  border-color: rgba(54, 83, 160, 0.18);
  color: #3653a0;
}

.device-detail__metric-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: inherit;
}

.device-detail__metric-value {
  font-size: 28px;
  font-weight: 700;
  color: inherit;
  line-height: 1.15;
  word-break: break-all;
}

.device-detail__metric-value em {
  margin-left: 4px;
  font-style: normal;
  font-size: 14px;
  font-weight: 600;
  color: #94a3b8;
}

.device-detail__metric:hover .device-detail__metric-value em,
.device-detail__metric.is-accent .device-detail__metric-value em {
  color: rgba(54, 83, 160, 0.65);
}

.device-detail__ops {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.device-detail__op {
  height: 100%;
  min-height: 120px;
  padding: 16px 8px;
  border: 1px solid #e4e7ed;
  border-radius: 32px;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  box-sizing: border-box;
}

.device-detail__op:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.device-detail__op.is-ringing {
  border-color: rgba(240, 65, 52, 0.35);
}

.device-detail__op-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.device-detail__op-icon.is-sleep,
.device-detail__op-icon.is-restart,
.device-detail__op-icon.is-ring {
  background: rgba(54, 83, 160, 0.1);
  color: #3653a0;
}

.device-detail__op-icon.is-shutdown,
.device-detail__op-icon.is-ring-stop {
  background: rgba(240, 65, 52, 0.1);
  color: #f04134;
}

.device-detail__op-icon img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.device-detail__op:hover:not(:disabled) {
  border-color: #3653a0;
  background: #f7fafc;
}

@media (max-width: 1100px) {
  .device-detail__row--top,
  .device-detail__row--bottom {
    grid-template-columns: 1fr;
  }
}
</style>
