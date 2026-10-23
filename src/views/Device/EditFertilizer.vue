<template>
  <div class="edit-fertilizer" v-loading="pageLoading">
    <div class="edit-fertilizer__header">
      <div class="edit-fertilizer__head-left">
        <button type="button" class="edit-fertilizer__back" @click="onBack">
          ← 返回
        </button>
        <h2 class="edit-fertilizer__title">编辑施肥机</h2>
      </div>
      <div class="edit-fertilizer__actions">
        <el-button
          class="edit-fertilizer__btn-delete"
          :loading="deleting"
          @click="onDelete"
        >
          删除
        </el-button>
        <el-button
          type="primary"
          class="edit-fertilizer__btn-save"
          :loading="saving"
          @click="onSave"
        >
          保存
        </el-button>
      </div>
    </div>

    <div v-if="deviceInfo" class="edit-fertilizer__grid">
      <!-- 设备信息：名称 + 位置 -->
      <section class="edit-fertilizer__card edit-fertilizer__card--info">
        <div class="edit-fertilizer__card-head">
          <span class="edit-fertilizer__card-icon-wrap">
            <img class="edit-fertilizer__card-icon" :src="icInfo" alt="" />
          </span>
          <span>设备信息</span>
        </div>

        <div class="edit-fertilizer__form">
          <div class="edit-fertilizer__field">
            <label>施肥机名称</label>
            <el-input
              v-model="deviceInfo.name"
              placeholder="请输入施肥机名称"
              clearable
              class="edit-fertilizer__input"
            />
          </div>
          <div class="edit-fertilizer__field">
            <label>施肥机位置</label>
            <div class="edit-fertilizer__location">
              <el-input
                :model-value="locationDisplay"
                readonly
                placeholder="暂无位置"
                class="edit-fertilizer__input"
              />
              <button
                type="button"
                class="edit-fertilizer__location-btn"
                @click="toChangeLocation"
              >
                修改位置
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 网络信息：只读 -->
      <section class="edit-fertilizer__card">
        <div class="edit-fertilizer__card-head">
          <span class="edit-fertilizer__card-icon-wrap">
            <img class="edit-fertilizer__card-icon" :src="icNetwork" alt="" />
          </span>
          <span>网络信息</span>
        </div>
        <div v-if="networkInfo" class="edit-fertilizer__kv-list">
          <div class="edit-fertilizer__kv">
            <span class="edit-fertilizer__kv-label">设备ID</span>
            <span
              class="edit-fertilizer__kv-value is-copy"
              title="点击复制"
              @click="copyText(networkInfo.deviceCode)"
            >
              {{ networkInfo.deviceCode || '--' }}
            </span>
          </div>
          <div class="edit-fertilizer__kv">
            <span class="edit-fertilizer__kv-label">网卡编号</span>
            <span
              class="edit-fertilizer__kv-value is-copy"
              title="点击复制"
              @click="copyText(networkInfo.iccidRaw)"
            >
              {{ networkInfo.iccidText }}
            </span>
          </div>
          <div class="edit-fertilizer__kv">
            <span class="edit-fertilizer__kv-label">激活时间</span>
            <span class="edit-fertilizer__kv-value">
              {{ networkInfo.activationTimeText }}
            </span>
          </div>
          <div class="edit-fertilizer__kv">
            <span class="edit-fertilizer__kv-label">网络状态</span>
            <div v-if="networkInfo.networkStatusEmpty" class="edit-fertilizer__kv-value">
              --
            </div>
            <div v-else class="edit-fertilizer__signal">
              <div class="edit-fertilizer__signal-bars" aria-hidden="true">
                <span
                  v-for="i in 5"
                  :key="i"
                  class="edit-fertilizer__signal-bar"
                  :class="{ 'is-active': signalLevel >= i }"
                  :style="{ height: `${20 + i * 10}%` }"
                ></span>
              </div>
              <span class="edit-fertilizer__signal-text">
                {{ networkStatusText }}
              </span>
            </div>
          </div>
          <div class="edit-fertilizer__kv">
            <span class="edit-fertilizer__kv-label">网络运营商</span>
            <span class="edit-fertilizer__kv-value">
              {{ networkInfo.operatorName || '--' }}
            </span>
          </div>
          <div class="edit-fertilizer__kv">
            <span class="edit-fertilizer__kv-label">软件版本</span>
            <span class="edit-fertilizer__version-badge">
              {{ networkInfo.softwareVersion || '--' }}
            </span>
          </div>
        </div>
        <div v-else class="edit-fertilizer__empty">暂无网络数据</div>
      </section>
    </div>
  </div>
</template>

<script setup>
/**
 * 编辑施肥机
 * 布局对齐 DeviceDetail；业务对齐移动端 edit_fertilizer
 * - 设备信息：名称、位置（地图选点回填，保存时落库）
 * - 网络信息：只读展示 + getNetCard 运营商
 */
import { computed, onActivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFarmStore } from '@/store/farm'
import {
  deleteDevice,
  getFismartInfo,
  getNetCard,
  updateDevice
} from '@/api/device'
import icInfo from '@/assets/device/detail/ic_info.png'
import icNetwork from '@/assets/device/detail/ic_network.png'

const FISMART_DEVICE_TYPE = 52

const route = useRoute()
const router = useRouter()
const farmStore = useFarmStore()

const pageLoading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const deviceInfo = ref(null)
const networkInfo = ref(null)

let offDeviceMsg = null

const deviceId = computed(
  () => route.query.id ?? farmStore.s_control_device?.id ?? null
)

const locationDisplay = computed(() => {
  const info = deviceInfo.value
  if (!info) return ''
  const lng = info.longitude
  const lat = info.latitude
  if (lng == null || lng === '' || lat == null || lat === '') return ''
  return `${lng},${lat}`
})

const signalLevel = computed(() =>
  getSignalLevel(Number(networkInfo.value?.signal))
)

const networkStatusText = computed(() => {
  if (!networkInfo.value || networkInfo.value.networkStatusEmpty) return '--'
  const signal = networkInfo.value.signal
  const snr = networkInfo.value.snr
  let text = signal == null || signal === '' ? '--' : `${signal}dBm`
  if (snr != null && snr !== '') text += `(${snr})`
  return text
})

function getFarmId() {
  return farmStore.selectFarm?.id ?? farmStore.s_selectFarm?.id ?? null
}

function toCoordNumber(val) {
  if (val === null || val === undefined || val === '') return null
  const num = Number(val)
  return Number.isFinite(num) ? num : null
}

function getSignalLevel(val) {
  const sig0 = Number.isFinite(val) ? val : -105
  if (sig0 > -85) return 5
  if (sig0 > -90) return 4
  if (sig0 > -95) return 3
  if (sig0 > -100) return 2
  if (sig0 > -105) return 1
  return 0
}

function formatUtc(utc) {
  if (!utc) return '--'
  const d = new Date(utc)
  if (Number.isNaN(d.getTime())) return '--'
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function textEmptyUnity2(val, prefix = 'V') {
  if (val === null || val === undefined || val === '') return ''
  const s = String(val)
  if (!prefix) return s
  const lower = s.toLowerCase()
  const p = String(prefix).toLowerCase()
  return lower.startsWith(p) ? s : `${prefix}${s}`
}

function getDeviceCodeFallback(device, cached = {}) {
  const src = device || cached || {}
  return src.deviceCode || src.serialNumber || src.deviceNum || '--'
}

function formatIccidText(iccid) {
  if (iccid === null || iccid === undefined || iccid === '') return '--'
  return String(iccid)
}

function isNetworkStatusEmpty(signal, snr) {
  return (
    (signal === null || signal === undefined) &&
    (snr === null || snr === undefined)
  )
}

function mapCarrierToOperatorName(carrier) {
  const code = Number(carrier)
  if (code === 0) return '中国移动'
  if (code === 1) return '中国电信'
  if (code === 2) return '中国联通'
  return '未知'
}

async function copyText(text) {
  if (!text || text === '--') return
  try {
    await navigator.clipboard.writeText(String(text))
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

function applyDevice(src) {
  if (!src) return
  deviceInfo.value = {
    id: src.id,
    name: src.name || '',
    deviceCode: src.deviceCode || src.serialNumber || '',
    longitude: src.longitude,
    latitude: src.latitude,
    address: src.address || '',
    landId: src.landId,
    landName: src.landName || '',
    coordinateType: src.coordinateType ?? 1,
    orientationAngle: src.orientationAngle ?? 0,
    isOnline: src.isOnline,
    farmId: src.farmId,
    type: src.type ?? FISMART_DEVICE_TYPE,
    iccid: src.iccid,
    signal: src.signal,
    snr: src.snr,
    softwareVersion: src.softwareVersion,
    activationTimeUtc: src.activationTimeUtc
  }
}

function applyNetworkFromDevice(data) {
  const cached = farmStore.s_control_device || {}
  const device = data || deviceInfo.value || {}
  const iccid = device.iccid != null ? device.iccid : cached.iccid
  const rawSignal = device.signal != null ? device.signal : cached.signal
  const rawSnr = device.snr != null ? device.snr : cached.snr
  networkInfo.value = {
    deviceCode: getDeviceCodeFallback(device, cached),
    iccidText: formatIccidText(iccid),
    iccidRaw: iccid || '',
    activationTimeText: formatUtc(
      device.activationTimeUtc || cached.activationTimeUtc
    ),
    signal: rawSignal,
    snr: rawSnr,
    networkStatusEmpty: isNetworkStatusEmpty(rawSignal, rawSnr),
    operatorName: '--',
    softwareVersion:
      textEmptyUnity2(
        device.softwareVersion || cached.softwareVersion,
        'V'
      ) || '--'
  }
  resolveOperatorName(iccid)
}

function applyFismartInfo(data) {
  const cached = farmStore.s_control_device || {}
  const prev = deviceInfo.value || {}
  deviceInfo.value = {
    ...prev,
    id: data.id != null ? data.id : prev.id || cached.id,
    name: data.name || prev.name || cached.name || '',
    deviceCode:
      data.deviceCode ||
      prev.deviceCode ||
      cached.deviceCode ||
      cached.serialNumber ||
      '',
    longitude:
      data.longitude != null && data.longitude !== ''
        ? data.longitude
        : prev.longitude != null
          ? prev.longitude
          : cached.longitude,
    latitude:
      data.latitude != null && data.latitude !== ''
        ? data.latitude
        : prev.latitude != null
          ? prev.latitude
          : cached.latitude,
    address: data.address || prev.address || cached.address || '',
    landId: data.landId != null ? data.landId : prev.landId ?? cached.landId,
    landName: data.landName || prev.landName || cached.landName || '',
    coordinateType:
      data.coordinateType ?? prev.coordinateType ?? cached.coordinateType ?? 1,
    orientationAngle:
      data.orientationAngle ??
      prev.orientationAngle ??
      cached.orientationAngle ??
      0,
    isOnline:
      data.isOnline !== undefined && data.isOnline !== null
        ? data.isOnline
        : prev.isOnline,
    farmId: data.farmId ?? prev.farmId ?? cached.farmId,
    type: data.type ?? prev.type ?? FISMART_DEVICE_TYPE,
    iccid: data.iccid != null ? data.iccid : prev.iccid ?? cached.iccid,
    signal: data.signal != null ? data.signal : prev.signal ?? cached.signal,
    snr: data.snr != null ? data.snr : prev.snr ?? cached.snr,
    softwareVersion:
      data.softwareVersion || prev.softwareVersion || cached.softwareVersion,
    activationTimeUtc:
      data.activationTimeUtc ||
      prev.activationTimeUtc ||
      cached.activationTimeUtc
  }
  applyNetworkFromDevice(deviceInfo.value)
  farmStore.setControlDevice(deviceInfo.value)
}

async function resolveOperatorName(iccid) {
  if (!networkInfo.value) return
  if (iccid === null || iccid === undefined || iccid === '') {
    networkInfo.value.operatorName = '--'
    return
  }
  try {
    const res = await getNetCard(iccid, { silent: true })
    if (networkInfo.value) {
      networkInfo.value.operatorName = mapCarrierToOperatorName(
        res?.data?.carrier
      )
    }
  } catch {
    if (networkInfo.value) networkInfo.value.operatorName = '--'
  }
}

async function loadPageData() {
  const id = deviceId.value
  if (id == null || id === '') {
    ElMessage.warning('缺少设备信息')
    router.replace('/device')
    return
  }

  const cached = farmStore.s_control_device
  if (cached && String(cached.id) === String(id)) {
    applyDevice(cached)
    applyNetworkFromDevice(cached)
  }

  pageLoading.value = true
  try {
    const res = await getFismartInfo(id, { silent: false, loading: false })
    if (res?.data) {
      applyFismartInfo(res.data)
    } else if (!networkInfo.value) {
      applyNetworkFromDevice(deviceInfo.value)
    }
  } catch (e) {
    console.error('[EditFertilizer] getFismartInfo 失败', e)
    if (!networkInfo.value) applyNetworkFromDevice(deviceInfo.value)
    if (!deviceInfo.value) {
      ElMessage.error('获取施肥机信息失败')
    }
  } finally {
    pageLoading.value = false
  }
}

function buildMapDeviceItem() {
  const info = deviceInfo.value
  if (!info?.id) return null
  return {
    id: info.id,
    farmId: info.farmId ?? getFarmId(),
    landId: info.landId,
    landName: info.landName,
    type: FISMART_DEVICE_TYPE,
    name: info.name,
    deviceCode: info.deviceCode,
    address: info.address || '',
    longitude: toCoordNumber(info.longitude),
    latitude: toCoordNumber(info.latitude),
    coordinateType: info.coordinateType ?? 1,
    orientationAngle: info.orientationAngle ?? 0,
    status: 1,
    deviceKind: 'fismart'
  }
}

/** 对齐移动端 toChangeLocation → map-edit-fismart；PC 用 returnOnly 回传 */
function toChangeLocation() {
  if (!deviceInfo.value) return
  const name = (deviceInfo.value.name || '').trim()
  if (!name) {
    ElMessage.warning('请输入施肥机名称')
    return
  }
  const item = buildMapDeviceItem()
  if (!item) return

  // 跳转地图前写入 store，返回后可恢复未保存的名称等本地编辑
  farmStore.setControlDevice(deviceInfo.value)
  farmStore.setEditDeviceMap({
    deviceListOK: [],
    deviceListNo: [item],
    returnOnly: true
  })
  router.push({
    path: '/map/edit-fismart',
    query: { type: 'edit', event: 'location' }
  })
}

function applyLocationDevice(device) {
  if (!device || !deviceInfo.value) return
  deviceInfo.value = {
    ...deviceInfo.value,
    landId: device.landId != null ? device.landId : deviceInfo.value.landId,
    landName: device.landName ?? deviceInfo.value.landName,
    longitude: device.longitude,
    latitude: device.latitude,
    address: device.address ?? deviceInfo.value.address,
    orientationAngle:
      device.orientationAngle ?? deviceInfo.value.orientationAngle,
    coordinateType: device.coordinateType ?? deviceInfo.value.coordinateType
  }
  farmStore.setControlDevice(deviceInfo.value)
}

function consumePendingLocation() {
  const list = farmStore.consumePendingIotLocation()
  const device = Array.isArray(list) ? list[0] : null
  if (device) applyLocationDevice(device)
}

function onDeviceMsg(json) {
  const { topic, data } = json || {}
  if (topic !== 'addLocationConform' || !data?.[0]) return
  farmStore.consumePendingIotLocation()
  applyLocationDevice(data[0])
}

function onBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/device')
}

async function onSave() {
  if (!deviceInfo.value?.id || saving.value) return
  const name = (deviceInfo.value.name || '').trim()
  if (!name) {
    ElMessage.warning('请输入施肥机名称')
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
      orientationAngle: deviceInfo.value.orientationAngle
    })
    deviceInfo.value.name = name
    farmStore.setControlDevice(deviceInfo.value)
    ElMessage.success('操作成功')
    await farmStore.fetchFarmList()
    farmStore.refreshDeviceList('施肥机信息已更新')
    setTimeout(() => router.back(), 600)
  } catch (e) {
    console.error('[EditFertilizer] 保存失败', e)
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
    // 对齐移动端 delta:2：回到设备列表
    setTimeout(() => router.replace('/device'), 600)
  } catch (e) {
    console.error('[EditFertilizer] 删除失败', e)
    ElMessage.error(e?.message || '删除设备失败')
  } finally {
    deleting.value = false
  }
}

/**
 * 挂载：
 * - 有地图选点缓冲：先恢复 store 草稿 + 回填坐标，再静默刷新网络（不覆盖本地名称/位置）
 * - 否则：完整拉 getFismartInfo
 */
onMounted(async () => {
  offDeviceMsg = farmStore.onDeviceMsg(onDeviceMsg)

  const id = deviceId.value
  const hasPending = Array.isArray(farmStore.s_pending_iot_location) &&
    farmStore.s_pending_iot_location.length > 0
  const cached = farmStore.s_control_device

  if (hasPending) {
    if (cached && String(cached.id) === String(id)) {
      applyDevice(cached)
      applyNetworkFromDevice(cached)
    }
    consumePendingLocation()
    if (id != null && deviceInfo.value) {
      try {
        const res = await getFismartInfo(id, { silent: true })
        if (res?.data) {
          const keep = { ...deviceInfo.value }
          applyFismartInfo(res.data)
          deviceInfo.value = {
            ...deviceInfo.value,
            name: keep.name,
            longitude: keep.longitude,
            latitude: keep.latitude,
            address: keep.address,
            landId: keep.landId,
            landName: keep.landName,
            orientationAngle: keep.orientationAngle,
            coordinateType: keep.coordinateType
          }
          applyNetworkFromDevice(deviceInfo.value)
        }
      } catch (e) {
        console.error('[EditFertilizer] 返回后刷新网络信息失败', e)
      }
    }
    return
  }

  await loadPageData()
})

onActivated(() => {
  consumePendingLocation()
})

onUnmounted(() => {
  offDeviceMsg?.()
})

watch(
  () => route.query.id,
  async (id, prev) => {
    if (id != null && String(id) !== String(prev)) {
      networkInfo.value = null
      await loadPageData()
    }
  }
)
</script>

<style scoped>
.edit-fertilizer {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 20px 24px 24px;
  background: #f7fafc;
  overflow: auto;
}

.edit-fertilizer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
}

.edit-fertilizer__head-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.edit-fertilizer__back {
  border: none;
  background: transparent;
  color: #3653a0;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.edit-fertilizer__title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1a3b87;
  line-height: 1.2;
}

.edit-fertilizer__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.edit-fertilizer__btn-delete {
  height: 40px;
  padding: 0 20px;
  border-radius: 999px;
  color: #f24724;
  background: #fff;
  border: 1px solid #e8ebf0;
  font-weight: 600;
}

.edit-fertilizer__btn-delete:hover {
  color: #f24724;
  background: #fff;
  border-color: #f0c2c2;
}

.edit-fertilizer__btn-save {
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

.edit-fertilizer__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.85fr);
  gap: 16px;
  align-items: stretch;
}

.edit-fertilizer__card {
  background: #fff;
  border-radius: 16px;
  padding: 20px 22px 24px;
  box-shadow: 0 4px 16px rgba(31, 45, 61, 0.06);
  box-sizing: border-box;
  min-height: 280px;
}

.edit-fertilizer__card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.edit-fertilizer__card-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e1efee;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.edit-fertilizer__card-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.edit-fertilizer__form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.edit-fertilizer__field label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

.edit-fertilizer__card--info :deep(.edit-fertilizer__input .el-input__wrapper) {
  border-radius: 999px;
  box-shadow: 0 0 0 1px #e8ebf0 inset;
  background: #fff;
  height: 44px;
  padding: 0 18px;
}

.edit-fertilizer__card--info
  :deep(.edit-fertilizer__input .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #3653a0 inset;
}

.edit-fertilizer__card--info :deep(.edit-fertilizer__input .el-input__inner) {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.edit-fertilizer__location {
  display: flex;
  align-items: center;
  gap: 10px;
}

.edit-fertilizer__location .edit-fertilizer__input {
  flex: 1;
  min-width: 0;
}

.edit-fertilizer__location-btn {
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

.edit-fertilizer__location-btn:hover {
  background: rgba(54, 83, 160, 0.18);
}

.edit-fertilizer__kv-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.edit-fertilizer__kv {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 28px;
}

.edit-fertilizer__kv-label {
  font-size: 13px;
  color: #909399;
  flex-shrink: 0;
}

.edit-fertilizer__kv-value {
  font-size: 14px;
  color: #303133;
  text-align: right;
  word-break: break-all;
}

.edit-fertilizer__kv-value.is-copy {
  cursor: pointer;
  color: #3653a0;
}

.edit-fertilizer__signal {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.edit-fertilizer__signal-bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  width: 24px;
  height: 12px;
  flex-shrink: 0;
}

.edit-fertilizer__signal-bar {
  width: 3px;
  flex: none;
  border-radius: 1px;
  background: #dcdfe6;
}

.edit-fertilizer__signal-bar.is-active {
  background: #303133;
}

.edit-fertilizer__signal-text {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  line-height: 1;
  white-space: nowrap;
}

.edit-fertilizer__version-badge {
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

.edit-fertilizer__empty {
  padding: 24px 0;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

@media (max-width: 1100px) {
  .edit-fertilizer__grid {
    grid-template-columns: 1fr;
  }
}
</style>
