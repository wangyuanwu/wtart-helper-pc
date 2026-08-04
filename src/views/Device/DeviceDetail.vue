<template>
  <div class="device-detail" v-loading="pageLoading">
    <div class="device-detail__header">
      <h2 class="device-detail__title">出水桩设置</h2>
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
      <!-- 设备信息 -->
      <section class="device-detail__card">
        <div class="device-detail__card-head">
          <span class="device-detail__card-icon-wrap">
            <img class="device-detail__card-icon" :src="icInfo" alt="" />
          </span>
          <span>设备信息</span>
        </div>

        <div class="device-detail__form">
          <div class="device-detail__field">
            <label>出水桩名称</label>
            <el-input v-model="deviceInfo.name" placeholder="请输入出水桩名称" clearable />
          </div>
          <div class="device-detail__field">
            <label>出水桩位置</label>
            <div class="device-detail__location">
              <el-input
                :model-value="locationDisplay"
                readonly
                placeholder="暂无位置"
              />
              <el-button link type="primary" @click="onChangeLocation">
                修改位置
              </el-button>
            </div>
          </div>
          <div class="device-detail__field">
            <label>设备方位</label>
            <el-select v-model="orientationAngle" style="width: 100%">
              <el-option
                v-for="opt in ORIENTATION_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </div>
          <div class="device-detail__field">
            <label>所属地块</label>
            <el-input :model-value="deviceInfo.landName || '--'" readonly />
          </div>
        </div>

        <!-- 关联主供水泵房：移动端暂未实现，保留业务出口 -->
        <div class="device-detail__pump">
          <img class="device-detail__pump-icon" :src="icPump" alt="" />
          <div class="device-detail__pump-info">
            <div class="device-detail__pump-name">
              {{ pumpDisplayName }}
            </div>
            <div class="device-detail__pump-desc">
              在出水桩开启完毕后，该出水桩关联的泵房将自动打开。
            </div>
          </div>
          <el-button class="device-detail__pump-btn" @click="onChangePump">
            <el-icon><Refresh /></el-icon>
            更换设备
          </el-button>
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
            <span class="device-detail__kv-label">初次激活</span>
            <span class="device-detail__kv-value">
              {{ formatUtc(otherInfo.activationTimeUtc) }}
            </span>
          </div>
          <div class="device-detail__kv">
            <span class="device-detail__kv-label">网络状态</span>
            <span
              class="device-detail__net-badge"
              :class="isOnline ? 'is-on' : 'is-off'"
            >
              <i class="iconfont icon-map_ic_signal"></i>
              <span v-if="snrText" class="device-detail__snr">{{ snrText }}</span>
              {{ isOnline ? '在线' : '离线' }}
            </span>
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
          <div class="device-detail__kv">
            <span class="device-detail__kv-label">软件版本</span>
            <span class="device-detail__version-badge">
              {{ softwareVersionText }}
            </span>
          </div>
          <div class="device-detail__kv">
            <span class="device-detail__kv-label">硬件版本</span>
            <span class="device-detail__version-badge">
              {{ hardwareVersionText }}
            </span>
          </div>
        </div>
        <div v-else class="device-detail__empty">暂无网络数据</div>
      </section>

      <!-- 设备数据 -->
      <section class="device-detail__card">
        <div class="device-detail__card-head">
          <span class="device-detail__card-icon-wrap">
            <img class="device-detail__card-icon" :src="icData" alt="" />
          </span>
          <span>设备数据</span>
          <span v-if="syncTime" class="device-detail__sync-time">
            上次同步 {{ syncTime }}
          </span>
          <el-button
            link
            type="primary"
            class="device-detail__sync-btn"
            :loading="syncing"
            @click="fetchOtherData({ toast: true })"
          >
            立即同步
          </el-button>
        </div>

        <div v-if="otherInfo" class="device-detail__data">
          <div class="device-detail__battery">
            <div class="device-detail__battery-top">
              <div>
                <div class="device-detail__battery-label">系统剩余电量</div>
                <div class="device-detail__battery-value">
                  {{ batteryPercentText }}
                </div>
              </div>
              <div class="device-detail__charge-status">
                <i class="iconfont icon-map_ic_battery"></i>
                {{ chargingText }}
              </div>
            </div>
            <div class="device-detail__battery-bar">
              <div
                class="device-detail__battery-fill"
                :style="{ width: `${batteryPercent}%` }"
              ></div>
            </div>
          </div>

          <div class="device-detail__metrics">
            <button
              type="button"
              class="device-detail__metric"
              :class="{ 'is-accent': selectedMetric === 'SolarPanelVoltage' }"
              @click="openChart('SolarPanelVoltage')"
            >
              <div class="device-detail__metric-label">太阳能板电压</div>
              <div class="device-detail__metric-value">
                {{ solarVoltageText }}
                <em>VOLT</em>
              </div>
            </button>
            <button
              type="button"
              class="device-detail__metric"
              :class="{ 'is-accent': selectedMetric === 'ChargingCurrent' }"
              @click="openChart('ChargingCurrent')"
            >
              <div class="device-detail__metric-label">充电电流</div>
              <div class="device-detail__metric-value">
                {{ chargingCurrentText }}
                <em>AMP</em>
              </div>
            </button>
            <button
              type="button"
              class="device-detail__metric"
              :class="{ 'is-accent': selectedMetric === 'MotorCurrent' }"
              @click="openChart('MotorCurrent')"
            >
              <div class="device-detail__metric-label">电机运行电流</div>
              <div class="device-detail__metric-value">
                {{ motorCurrentText }}
                <em>AMP</em>
              </div>
            </button>
          </div>
        </div>
        <div v-else class="device-detail__empty">暂无设备数据</div>
      </section>

      <!-- 设备操作 -->
      <section class="device-detail__card">
        <div class="device-detail__card-head">
          <span class="device-detail__card-icon-wrap">
            <img class="device-detail__card-icon" :src="icOps" alt="" />
          </span>
          <span>设备操作</span>
        </div>
        <div class="device-detail__ops">
          <button type="button" class="device-detail__op" @click="onSleep">
            <img :src="icSleep" alt="" />
            <span>定时休眠</span>
          </button>
          <button type="button" class="device-detail__op" @click="onRestart">
            <img :src="icRestart" alt="" />
            <span>远程重启</span>
          </button>
          <button type="button" class="device-detail__op" @click="onShutdown">
            <img :src="icShutdown" alt="" />
            <span>紧急关机</span>
          </button>
          <button type="button" class="device-detail__op" @click="onFirmwareUpdate">
            <img :src="icUpdate" alt="" />
            <span>固件更新</span>
          </button>
        </div>
      </section>
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
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { useFarmStore } from '@/store/farm'
import {
  closeRestartDv,
  deleteDevice,
  getDeviceDetail,
  getWaterOutletPileData,
  updateDevice
} from '@/api/device'
import {
  OPERATOR_TYPE_LIST,
  ORIENTATION_OPTIONS,
  snapOrientationAngle
} from '@/utils/deviceOrientation'
import DeviceSleepDialog from './DeviceSleepDialog.vue'
import DeviceChartDialog from './DeviceChartDialog.vue'
import icInfo from '@/assets/device/detail/ic_info.png'
import icNetwork from '@/assets/device/detail/ic_network.png'
import icData from '@/assets/device/detail/ic_data.png'
import icOps from '@/assets/device/detail/ic_ops.png'
import icPump from '@/assets/device/detail/ic_pump.png'
import icSleep from '@/assets/device/detail/ic_sleep.png'
import icRestart from '@/assets/device/detail/ic_restart.png'
import icShutdown from '@/assets/device/detail/ic_shutdown.png'
import icUpdate from '@/assets/device/detail/ic_update.png'

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

const deviceInfo = ref(null)
const otherInfo = ref(null)
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

const hardwareVersionText = computed(() => {
  const v = otherInfo.value?.pcbVersion
  if (v == null || v === '') return '--'
  const s = String(v)
  return s.toLowerCase().startsWith('v') ? s : `V${s}`
})

const snrText = computed(() => {
  const snr = otherInfo.value?.snr
  if (snr == null || snr === '') return ''
  return `(${snr})`
})

const batteryPercent = computed(() => {
  const n = Number(otherInfo.value?.batteryPercent)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
})

const batteryPercentText = computed(() => `${batteryPercent.value}%`)

const chargingText = computed(() => {
  const s = Number(otherInfo.value?.chargingStatus)
  return s === 1 ? '充电中' : '未充电'
})

const pumpDisplayName = computed(() => {
  // 移动端关联水泵未实现，仅占位展示
  return '主供水泵房 (未关联)'
})

function formatNum(v, digits = 2) {
  if (v == null || v === '') return '--'
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return n.toFixed(digits)
}

/** 电流接口多为 mA，设计稿展示 AMP */
function mAToAmp(v) {
  if (v == null || v === '') return '--'
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return (n / 1000).toFixed(2)
}

const solarVoltageText = computed(() =>
  formatNum(otherInfo.value?.waterOutletPile?.solarPanelVoltage)
)
const chargingCurrentText = computed(() =>
  mAToAmp(otherInfo.value?.waterOutletPile?.chargingCurrent)
)
const motorCurrentText = computed(() =>
  mAToAmp(otherInfo.value?.waterOutletPile?.motorCurrent)
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
    if (toast) ElMessage.success('操作成功')
  } catch (e) {
    console.error('[DeviceDetail] 同步设备数据失败', e)
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
    setTimeout(() => router.back(), 600)
  } catch (e) {
    console.error('[DeviceDetail] 保存失败', e)
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
    setTimeout(() => {
      router.replace('/device')
    }, 600)
  } catch (e) {
    console.error('[DeviceDetail] 删除失败', e)
  } finally {
    deleting.value = false
  }
}

function onChangeLocation() {
  ElMessage.info('修改位置功能开发中')
}

function onChangePump() {
  ElMessage.info('关联主供水泵房功能开发中')
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
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
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
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
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

function onFirmwareUpdate() {
  ElMessage.info('固件更新功能开发中')
}

onMounted(async () => {
  await loadDeviceDetail()
  await fetchOtherData({ toast: false })
})

watch(
  () => route.query.id,
  async (id, prev) => {
    if (id != null && String(id) !== String(prev)) {
      otherInfo.value = null
      syncTime.value = ''
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
}

.device-detail__title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
}

.device-detail__actions {
  display: flex;
  gap: 12px;
}

.device-detail__btn-delete {
  height: 40px;
  border-radius: 10px;
  color: #f56c6c;
  border-color: #f0c2c2;
}

.device-detail__btn-save {
  height: 40px;
  border-radius: 10px;
  --el-button-bg-color: #3653a0;
  --el-button-border-color: #3653a0;
  --el-button-hover-bg-color: #2f4a90;
  --el-button-hover-border-color: #2f4a90;
}

.device-detail__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.85fr);
  gap: 16px;
  align-items: stretch;
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

.device-detail__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.device-detail__field label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #909399;
}

.device-detail__location {
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-detail__location .el-input {
  flex: 1;
}

.device-detail__pump {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #f0f4f7;
  display: flex;
  align-items: center;
  gap: 12px;
}

.device-detail__pump-icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
  flex-shrink: 0;
}

.device-detail__pump-info {
  flex: 1;
  min-width: 0;
}

.device-detail__pump-name {
  font-size: 14px;
  font-weight: 700;
  color: #303133;
}

.device-detail__pump-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.device-detail__pump-btn {
  flex-shrink: 0;
  border-radius: 8px;
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

.device-detail__kv-value.is-copy {
  cursor: pointer;
  color: #3653a0;
}

.device-detail__net-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border-radius: 13px;
  font-size: 12px;
  font-weight: 600;
}

.device-detail__net-badge.is-on {
  background: rgba(0, 201, 112, 0.12);
  color: #00c970;
}

.device-detail__net-badge.is-off {
  background: #f0f2f5;
  color: #909399;
}

.device-detail__net-badge .iconfont {
  font-size: 14px;
}

.device-detail__snr {
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
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

.device-detail__battery {
  margin-bottom: 16px;
}

.device-detail__battery-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.device-detail__battery-label {
  font-size: 13px;
  color: #909399;
}

.device-detail__battery-value {
  margin-top: 4px;
  font-size: 36px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
}

.device-detail__charge-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #606266;
  font-weight: 600;
}

.device-detail__battery-bar {
  margin-top: 12px;
  height: 12px;
  border-radius: 6px;
  background: #e8edf2;
  overflow: hidden;
}

.device-detail__battery-fill {
  height: 100%;
  border-radius: 6px;
  background: #2a6b6b;
  transition: width 0.25s ease;
}

.device-detail__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.device-detail__metric {
  position: relative;
  padding: 14px 12px;
  border-radius: 12px;
  background: #f6fafc;
  overflow: hidden;
  border: 1px solid transparent;
  text-align: left;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
}

.device-detail__metric:hover {
  border-color: rgba(54, 83, 160, 0.25);
}

.device-detail__metric.is-accent {
  background: #e8f0fb;
}

.device-detail__metric.is-accent:hover {
  background: #e8f0fb;
}

.device-detail__metric-label {
  font-size: 12px;
  color: #909399;
}

.device-detail__metric-value {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.device-detail__metric-value em {
  margin-left: 4px;
  font-style: normal;
  font-size: 11px;
  font-weight: 600;
  color: #909399;
}

.device-detail__ops {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.device-detail__op {
  height: 96px;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.device-detail__op img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.device-detail__op:hover {
  border-color: #3653a0;
  background: #f7fafc;
}

@media (max-width: 1100px) {
  .device-detail__grid {
    grid-template-columns: 1fr;
  }
}
</style>
