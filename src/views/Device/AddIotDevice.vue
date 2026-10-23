<template>
  <div class="add-iot-device">
    <section class="add-iot-device__card">
      <header class="add-iot-device__header">
        <span class="add-iot-device__icon-wrap">
          <img class="add-iot-device__icon" :src="iotTitleIcon" alt="" />
        </span>
        <h1 class="add-iot-device__title">添加物联网设备</h1>
      </header>

      <div class="add-iot-device__grid">
        <div class="add-iot-device__field">
          <label class="add-iot-device__label">设备名称</label>
          <input
            v-model="form.name"
            class="add-iot-device__input"
            type="text"
            maxlength="32"
            placeholder="施肥机"
          />
        </div>

        <div class="add-iot-device__field">
          <label class="add-iot-device__label">物联网设备编号</label>
          <input
            v-model="form.deviceCode"
            class="add-iot-device__input"
            type="text"
            maxlength="32"
            placeholder="2565263321"
          />
        </div>

        <div class="add-iot-device__field">
          <label class="add-iot-device__label">设备位置</label>
          <div class="add-iot-device__input-wrap">
            <input
              class="add-iot-device__input is-with-action"
              type="text"
              readonly
              :value="form.address"
              placeholder="请选择设备位置"
              @click="toSelectLocation"
            />
            <button
              type="button"
              class="add-iot-device__locate-btn"
              title="地图选择设备位置"
              @click="toSelectLocation"
            >
              <i class="iconfont icon-farm_ic_locate_02"></i>
            </button>
          </div>
        </div>

        <div class="add-iot-device__field">
          <label class="add-iot-device__label">所属地块</label>
          <button
            type="button"
            class="add-iot-device__land-trigger"
            @click="openLandPicker"
          >
            <span
              class="add-iot-device__land-text"
              :class="{ 'is-placeholder': !selectedLandText }"
            >
              {{ selectedLandText || '请选择地块' }}
            </span>
            <span class="add-iot-device__land-action">选择地块</span>
          </button>
        </div>
      </div>

      <footer class="add-iot-device__footer">
        <button type="button" class="add-iot-device__cancel" @click="onCancel">
          取消并返回
        </button>
        <button
          type="button"
          class="add-iot-device__confirm"
          :disabled="submitting"
          @click="onSubmit"
        >
          {{ submitting ? '提交中...' : '确认' }}
        </button>
      </footer>
    </section>

    <el-dialog
      v-model="landPickerVisible"
      title="选择地块"
      width="520px"
      append-to-body
      align-center
      :close-on-click-modal="false"
      class="add-iot-land-dialog"
    >
      <div class="add-iot-land-dialog__list">
        <label
          v-for="item in landOptions"
          :key="item.id"
          class="add-iot-land-dialog__item"
          :class="{ 'is-checked': draftLandIds.includes(item.id) }"
        >
          <input
            v-model="draftLandIds"
            class="add-iot-land-dialog__check"
            type="checkbox"
            :value="item.id"
          />
          <div class="add-iot-land-dialog__main">
            <div class="add-iot-land-dialog__name">{{ item.name }}</div>
            <div class="add-iot-land-dialog__addr">
              {{ item.address || '暂无地址' }}
            </div>
          </div>
        </label>
        <div v-if="!landOptions.length" class="add-iot-land-dialog__empty">
          暂无地块
        </div>
      </div>
      <template #footer>
        <el-button @click="landPickerVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmLandPicker">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 添加物联网设备
 * 对齐移动端 pages/home/activity/device/add_iot_device
 * 设备位置：跳转 map-edit-fismart?type=add 选点后经 deviceMsg 回填
 */
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { addDevice } from '@/api/device'
import { getLandList } from '@/api/map'
import { useFarmStore } from '@/store/farm'
import iotTitleIcon from '@/assets/device/add/ic_iot_title.svg'

/** 对齐移动端 add_iot_device：施肥机/物联网设备 type=52 */
const IOT_DEVICE_TYPE = 52

const router = useRouter()
const farmStore = useFarmStore()

const form = reactive({
  name: '',
  deviceCode: '',
  address: '',
  longitude: null,
  latitude: null,
  landIds: []
})

const landOptions = ref([])
const landPickerVisible = ref(false)
const draftLandIds = ref([])
const submitting = ref(false)

let offDeviceMsg = null

const selectedLandText = computed(() => {
  if (!form.landIds.length) return ''
  return landOptions.value
    .filter((item) => form.landIds.includes(item.id))
    .map((item) => item.name)
    .join('、')
})

function getFarmId() {
  return farmStore.selectFarm?.id ?? farmStore.s_selectFarm?.id ?? null
}

function toCoordNumber(val) {
  if (val === null || val === undefined || val === '') return null
  const num = Number(val)
  return Number.isFinite(num) ? num : null
}

function applyLocationDevice(device) {
  if (!device) return
  form.address = device.address || ''
  form.longitude = toCoordNumber(device.longitude)
  form.latitude = toCoordNumber(device.latitude)
  persistDraft()
}

function restoreDraft() {
  const draft = farmStore.s_add_iot_draft
  if (!draft) return
  form.name = draft.name || ''
  form.deviceCode = draft.deviceCode || ''
  form.address = draft.address || ''
  form.longitude = toCoordNumber(draft.longitude)
  form.latitude = toCoordNumber(draft.latitude)
  form.landIds = Array.isArray(draft.landIds) ? [...draft.landIds] : []
}

/** 消费地图选点回传（优先于草稿中的旧坐标） */
function consumePendingLocation() {
  const list = farmStore.consumePendingIotLocation()
  const device = Array.isArray(list) ? list[0] : null
  if (device) applyLocationDevice(device)
}

function persistDraft() {
  farmStore.setAddIotDraft({
    name: form.name,
    deviceCode: form.deviceCode,
    address: form.address,
    longitude: form.longitude,
    latitude: form.latitude,
    landIds: form.landIds
  })
}

async function fetchLandList() {
  const farmId = getFarmId()
  if (farmId == null) {
    landOptions.value = []
    return
  }
  try {
    const res = await getLandList({ farmId }, { silent: true })
    landOptions.value = Array.isArray(res?.data) ? res.data : []
  } catch (e) {
    console.error('[AddIotDevice] 获取地块列表失败', e)
    landOptions.value = []
  }
}

function openLandPicker() {
  draftLandIds.value = [...form.landIds]
  landPickerVisible.value = true
}

function confirmLandPicker() {
  form.landIds = [...draftLandIds.value]
  landPickerVisible.value = false
  persistDraft()
}

function onCancel() {
  farmStore.clearAddIotDraft()
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/device/add')
  }
}

/**
 * 对齐移动端 toSelectLocation：
 * 校验名称/编号 → 写入 vuex_edit_device_map(returnOnly) → 跳转施肥机地图选点
 */
function toSelectLocation() {
  const name = (form.name || '').trim()
  const deviceCode = (form.deviceCode || '').trim()
  if (!name) {
    ElMessage.warning('请输入设备名称')
    return
  }
  if (!deviceCode) {
    ElMessage.warning('请输入物联网设备编号')
    return
  }
  const farmId = getFarmId()
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    return
  }

  const landId = form.landIds.length ? form.landIds[0] : null
  const deviceItem = {
    farmId,
    landId,
    type: IOT_DEVICE_TYPE,
    name,
    deviceCode,
    address: form.address || '',
    longitude: form.longitude,
    latitude: form.latitude,
    coordinateType: 1,
    orientationAngle: 0,
    status: 1,
    deviceKind: 'fismart'
  }

  persistDraft()
  farmStore.setEditDeviceMap({
    deviceListOK: [],
    deviceListNo: [deviceItem],
    returnOnly: true
  })
  router.push({ path: '/map/edit-fismart', query: { type: 'add' } })
}

/** 对齐移动端 onDeviceMsg(addLocationConform) */
function onDeviceMsg(json) {
  const { topic, data } = json || {}
  if (topic !== 'addLocationConform' || !data?.[0]) return
  // 事件与 pending 二选一，避免重复写入
  farmStore.consumePendingIotLocation()
  applyLocationDevice(data[0])
}

async function onSubmit() {
  if (submitting.value) return

  const farmId = getFarmId()
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    return
  }
  const name = form.name.trim()
  const deviceCode = form.deviceCode.trim()
  if (!name) {
    ElMessage.warning('请输入设备名称')
    return
  }
  if (!deviceCode) {
    ElMessage.warning('请输入物联网设备编号')
    return
  }
  if (!(form.address || '').trim()) {
    ElMessage.warning('请选择设备位置')
    return
  }
  if (form.longitude == null || form.latitude == null) {
    ElMessage.warning('设备位置缺少经纬度，请重新选择')
    return
  }
  if (!form.landIds.length) {
    ElMessage.warning('请选择所属地块')
    return
  }

  submitting.value = true
  try {
    await addDevice([
      {
        farmId,
        landId: form.landIds[0],
        type: IOT_DEVICE_TYPE,
        name,
        deviceCode,
        address: form.address.trim(),
        longitude: form.longitude,
        latitude: form.latitude,
        coordinateType: 1,
        orientationAngle: 0
      }
    ])
    ElMessage.success('添加成功')
    farmStore.clearAddIotDraft()
    farmStore.setEditDeviceMap({
      deviceListOK: [],
      deviceListNo: [],
      returnOnly: false
    })
    farmStore.notifyAddNewDevice()
    router.replace('/map')
  } catch (e) {
    console.error('[AddIotDevice] 添加设备失败', e)
    ElMessage.error(e?.message || '添加设备失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  restoreDraft()
  consumePendingLocation()
  fetchLandList()
  offDeviceMsg = farmStore.onDeviceMsg(onDeviceMsg)
})

onUnmounted(() => {
  offDeviceMsg?.()
})
</script>

<style scoped>
.add-iot-device {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #f5f7fa;
  /* 左右间歇由页面 padding 控制，卡片本身铺满内容区 */
  padding: 24px 24px 32px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.add-iot-device__card {
  width: 100%;
  flex: 1;
  min-height: 520px;
  margin: 0;
  padding: 36px 48px 40px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 8px 28px rgba(54, 83, 160, 0.08);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.add-iot-device__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}

.add-iot-device__icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #e8efff;
  flex-shrink: 0;
}

.add-iot-device__icon {
  width: 26px;
  height: 26px;
  object-fit: contain;
  display: block;
}

.add-iot-device__title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.3;
}

.add-iot-device__grid {
  /* 设计稿：固定两列；400PX 大写绕过 pxtorem，保证实宽 400px */
  display: grid;
  grid-template-columns: 400PX 400PX;
  column-gap: 80PX;
  row-gap: 24px;
  justify-content: start;
}

.add-iot-device__field {
  width: 400PX;
  min-width: 0;
  max-width: 400PX;
  box-sizing: border-box;
}

.add-iot-device__label {
  display: block;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  line-height: 1.2;
}

.add-iot-device__input-wrap {
  position: relative;
  width: 400PX;
  max-width: 400PX;
  box-sizing: border-box;
}

.add-iot-device__input {
  display: block;
  width: 400PX;
  max-width: 400PX;
  height: 44px;
  padding: 0 14px;
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  background: #fff;
  font-size: 14px;
  color: #303133;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s ease;
}

.add-iot-device__input.is-with-action {
  padding-right: 44px;
  cursor: pointer;
}

.add-iot-device__input:focus {
  border-color: #3653a0;
}

.add-iot-device__input::placeholder {
  color: #c0c4cc;
}

.add-iot-device__locate-btn {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #3653a0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.add-iot-device__locate-btn:hover {
  background: #f5f7fa;
}

.add-iot-device__locate-btn .iconfont {
  font-size: 18px;
  line-height: 1;
}

.add-iot-device__land-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 400PX;
  max-width: 400PX;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.add-iot-device__land-trigger:hover {
  border-color: #3653a0;
}

.add-iot-device__land-text {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-iot-device__land-text.is-placeholder {
  color: #c0c4cc;
}

.add-iot-device__land-action {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  color: #3653a0;
}

.add-iot-device__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  margin-top: auto;
  padding-top: 48px;
}

.add-iot-device__cancel {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
}

.add-iot-device__cancel:hover {
  color: #3653a0;
}

.add-iot-device__confirm {
  min-width: 220px;
  height: 44px;
  padding: 0 32px;
  border: none;
  border-radius: 22px;
  background: #3653a0;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(54, 83, 160, 0.24);
}

.add-iot-device__confirm:hover:not(:disabled) {
  background: #2f4788;
}

.add-iot-device__confirm:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.add-iot-land-dialog__list {
  max-height: 360px;
  overflow-y: auto;
}

.add-iot-land-dialog__item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 10px;
  border-bottom: 1px solid #f0f2f5;
  cursor: pointer;
}

.add-iot-land-dialog__item.is-checked {
  background: #f8faff;
}

.add-iot-land-dialog__check {
  margin-top: 4px;
  flex-shrink: 0;
}

.add-iot-land-dialog__main {
  min-width: 0;
  flex: 1;
}

.add-iot-land-dialog__name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.add-iot-land-dialog__addr {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.add-iot-land-dialog__empty {
  padding: 40px 16px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

@media (max-width: 900PX) {
  .add-iot-device__grid {
    grid-template-columns: 400PX;
    column-gap: 24PX;
  }
}
</style>
