<template>
  <div class="add-device-location">
    <!-- 定位同步中（设计稿图1） -->
    <div v-if="!isLocationOk" class="add-device-location__sync">
      <div class="add-device-location__sync-body">
        <img
          class="add-device-location__globe"
          :src="satelliteImg"
          alt=""
        />
        <el-icon class="add-device-location__spinner" :size="28">
          <Loading />
        </el-icon>
        <h2 class="add-device-location__sync-title">
          正在同步设备最新北斗定位信息请耐心等待...
        </h2>
        <p class="add-device-location__sync-sub">
          获取定位信息后可在地图上查看精准位置
        </p>
        <p class="add-device-location__sync-time">同步时间: {{ syncTime }}</p>
      </div>

      <div class="add-device-location__actions">
        <button
          type="button"
          class="add-device-location__link"
          @click="jumpNext"
        >
          跳过
        </button>
        <button
          type="button"
          class="add-device-location__btn is-primary"
          @click="upStep"
        >
          ← 上一步
        </button>
      </div>
    </div>

    <!-- 定位结果（设计稿图2） -->
    <div v-else class="add-device-location__result">
      <div class="add-device-location__result-scroll">
        <section
          v-if="allAddDeviceList.deviceListOK.length"
          class="add-device-location__section"
        >
          <div class="add-device-location__section-head">
            <span class="add-device-location__badge is-ok">✓</span>
            <span class="add-device-location__section-title">定位成功</span>
          </div>
          <div class="add-device-location__grid">
            <div
              v-for="(item, index) in allAddDeviceList.deviceListOK"
              :key="`ok-${item.deviceCode}-${index}`"
              class="add-device-location__card"
            >
              <img
                class="add-device-location__card-img"
                :src="outletImg"
                alt=""
              />
              <div class="add-device-location__card-info">
                <div class="add-device-location__card-name">{{ item.name }}</div>
                <div class="add-device-location__card-code">
                  ID: {{ item.deviceCode }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          v-if="allAddDeviceList.deviceListNo.length"
          class="add-device-location__section"
        >
          <div class="add-device-location__section-head">
            <span class="add-device-location__badge is-fail">−</span>
            <span class="add-device-location__section-title">定位失败</span>
            <button
              type="button"
              class="add-device-location__retry"
              :disabled="isLocating"
              @click="retryPosition"
            >
              <el-icon v-if="isLocating" class="is-loading" :size="14">
                <Loading />
              </el-icon>
              {{ isLocating ? '重新定位中' : '重新定位' }}
            </button>
          </div>
          <div class="add-device-location__grid">
            <div
              v-for="(item, index) in allAddDeviceList.deviceListNo"
              :key="`no-${item.deviceCode}-${index}`"
              class="add-device-location__card"
            >
              <img
                class="add-device-location__card-img"
                :src="outletImg"
                alt=""
              />
              <div class="add-device-location__card-info">
                <div class="add-device-location__card-name">{{ item.name }}</div>
                <div class="add-device-location__card-code">
                  ID: {{ item.deviceCode }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div
          v-if="
            !allAddDeviceList.deviceListOK.length &&
            !allAddDeviceList.deviceListNo.length
          "
          class="add-device-location__empty"
        >
          暂无设备数据
        </div>
      </div>

      <div class="add-device-location__actions">
        <button
          type="button"
          class="add-device-location__link"
          @click="onCancel"
        >
          取消
        </button>
        <button
          type="button"
          class="add-device-location__btn is-primary"
          @click="toDeviceMap"
        >
          下一步 →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { getPositon, startPositon } from '@/api/device'
import { useFarmStore } from '@/store/farm'
import { wgs84ToGcj02 } from '@/utils/coordTransform'
import outletImg from '@/assets/device/add/device_img_outl.png'
import satelliteImg from '@/assets/device/add/satellite.png'

const router = useRouter()
const farmStore = useFarmStore()

const isLocationOk = ref(false)
const isLocating = ref(false)
const syncTime = ref('--')
const allAddDeviceList = reactive({
  deviceListOK: [],
  deviceListNo: []
})

const TIME_OUT_MS = 60 * 1000
const POLL_MS = 3000
let intervalTimer = null
let positionStartTime = 0

function pad(n) {
  return String(n).padStart(2, '0')
}

function nowText() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function syncStore() {
  farmStore.setEditDeviceMap({
    deviceListOK: allAddDeviceList.deviceListOK,
    deviceListNo: allAddDeviceList.deviceListNo
  })
}

function getLocationDvObj() {
  return {
    deviceCodes: allAddDeviceList.deviceListNo.map((item) => item.deviceCode)
  }
}

function clearTimer() {
  if (intervalTimer) {
    clearInterval(intervalTimer)
    intervalTimer = null
  }
}

async function startPositonHttp() {
  const obj = getLocationDvObj()
  if (!obj.deviceCodes.length) return
  try {
    await startPositon(obj, { silent: true })
    ElMessage.info('设备定位中...')
  } catch (e) {
    console.error('[AddDeviceLocation] startPositon 失败', e)
  }
}

async function getPositonHttp() {
  const obj = getLocationDvObj()
  syncTime.value = nowText()

  if (!obj.deviceCodes.length) {
    isLocationOk.value = true
    isLocating.value = false
    clearTimer()
    syncStore()
    return
  }

  try {
    const res = await getPositon(obj, { silent: true })
    const list = Array.isArray(res?.data) ? res.data : []

    list.forEach((posItem) => {
      const targetIndex = allAddDeviceList.deviceListNo.findIndex(
        (item) => item.deviceCode === posItem.deviceCode
      )
      if (targetIndex === -1) return

      const deviceItem = allAddDeviceList.deviceListNo[targetIndex]
      deviceItem.updateTime = posItem.updateTime
      deviceItem.gnsStatus = posItem.gnsStatus

      const isValid = posItem.latitude != null && posItem.longitude != null
      if (!isValid) return

      const gcjPoint = wgs84ToGcj02(posItem.longitude, posItem.latitude)
      deviceItem.longitude = gcjPoint.lng
      deviceItem.latitude = gcjPoint.lat
      deviceItem.coordinateType = 1

      allAddDeviceList.deviceListNo.splice(targetIndex, 1)
      allAddDeviceList.deviceListOK.push(deviceItem)
    })

    syncStore()

    if (allAddDeviceList.deviceListNo.length === 0) {
      isLocationOk.value = true
      isLocating.value = false
      clearTimer()
      return
    }

    const usedTime = Date.now() - positionStartTime
    if (usedTime >= TIME_OUT_MS) {
      clearTimer()
      isLocationOk.value = true
      isLocating.value = false
      ElMessage.warning('定位超时，已停止同步定位信息')
    }
  } catch (e) {
    console.error('[AddDeviceLocation] getPositon 失败', e)
    const usedTime = Date.now() - positionStartTime
    if (usedTime >= TIME_OUT_MS) {
      clearTimer()
      isLocationOk.value = true
      isLocating.value = false
    }
  }
}

function startTimer() {
  clearTimer()
  positionStartTime = Date.now()
  isLocating.value = true
  intervalTimer = setInterval(() => {
    getPositonHttp()
  }, POLL_MS)
}

function retryPosition() {
  if (!allAddDeviceList.deviceListNo.length || isLocating.value) return
  positionStartTime = Date.now()
  startPositonHttp()
  startTimer()
}

function jumpNext() {
  clearTimer()
  isLocationOk.value = true
  isLocating.value = false
  syncStore()
}

function upStep() {
  clearTimer()
  router.back()
}

function onCancel() {
  clearTimer()
  router.push('/device/add-number')
}

function toDeviceMap() {
  clearTimer()
  isLocating.value = false
  syncStore()
  router.push({ path: '/map/edit-device', query: { type: 'add' } })
}

onMounted(() => {
  const farmId =
    farmStore.s_selectFarm?.id ?? farmStore.selectFarm?.id ?? null
  const source = Array.isArray(farmStore.s_edit_device)
    ? farmStore.s_edit_device
    : []

  if (!source.length) {
    ElMessage.warning('请先添加设备')
    router.replace('/device/add-number')
    return
  }

  const deviceList = source.map((item) => ({
    ...item,
    farmId,
    landId: null,
    type: 50,
    address: '',
    longitude: null,
    latitude: null,
    coordinateType: 1,
    orientationAngle: 0,
    status: 1
  }))

  allAddDeviceList.deviceListOK = []
  allAddDeviceList.deviceListNo = deviceList
  syncStore()

  startPositonHttp()
  startTimer()
  getPositonHttp()
})

onUnmounted(() => {
  clearTimer()
})
</script>

<style scoped>
.add-device-location {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  box-sizing: border-box;
}

.add-device-location__sync {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.add-device-location__sync-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px 24px;
  text-align: center;
}

.add-device-location__globe {
  width: 220px;
  height: 220px;
  object-fit: contain;
}

.add-device-location__spinner {
  margin-top: 16px;
  color: #3653a0;
  animation: add-loc-spin 1s linear infinite;
}

.add-device-location__sync-title {
  margin: 20px 0 0;
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  line-height: 1.5;
}

.add-device-location__sync-sub {
  margin: 10px 0 0;
  font-size: 14px;
  color: #606266;
}

.add-device-location__sync-time {
  margin: 8px 0 0;
  font-size: 12px;
  color: #909399;
}

.add-device-location__result {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f7fafc;
}

.add-device-location__result-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 24px 28px 16px;
}

.add-device-location__section + .add-device-location__section {
  margin-top: 28px;
}

.add-device-location__section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.add-device-location__badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.add-device-location__badge.is-ok {
  background: #00c970;
}

.add-device-location__badge.is-fail {
  background: #f56c6c;
}

.add-device-location__section-title {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.add-device-location__retry {
  margin-left: auto;
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 16px;
  background: #3653a0;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.add-device-location__retry:disabled {
  opacity: 0.85;
  cursor: default;
}

.add-device-location__retry .is-loading {
  animation: add-loc-spin 1s linear infinite;
}

.add-device-location__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.add-device-location__card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
}

.add-device-location__card-img {
  width: 52px;
  height: 52px;
  object-fit: contain;
  flex-shrink: 0;
}

.add-device-location__card-info {
  min-width: 0;
}

.add-device-location__card-name {
  font-size: 14px;
  font-weight: 700;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-device-location__card-code {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.add-device-location__empty {
  padding: 80px 0;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.add-device-location__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding: 16px 28px;
  background: #fff;
  border-top: 1px solid #ebeef5;
}

.add-device-location__link {
  border: none;
  background: transparent;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 4px;
}

.add-device-location__link:hover {
  color: #3653a0;
}

.add-device-location__btn {
  height: 40px;
  min-width: 120px;
  padding: 0 20px;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.add-device-location__btn.is-primary {
  background: #3653a0;
  color: #fff;
}

.add-device-location__btn.is-primary:hover {
  background: #2d4590;
}

@keyframes add-loc-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1200px) {
  .add-device-location__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .add-device-location__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
