<template>
  <el-dialog
    :model-value="modelValue"
    width="520px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    class="device-land-sort-dialog"
    @update:model-value="onVisibleChange"
  >
    <template #header>
      <div class="device-land-sort-dialog__header">
        <span class="device-land-sort-dialog__title">设备排序</span>
        <el-button type="primary" link :loading="saving" @click="saveOrder">
          保存排序
        </el-button>
      </div>
    </template>

    <div v-loading="loading" class="device-land-sort-dialog__body">
      <div
        v-if="!deviceList.length && !loading"
        class="device-land-sort-dialog__empty"
      >
        没有发现设备
      </div>

      <div
        v-for="(item, index) in deviceList"
        :key="item.id"
        class="device-land-sort-dialog__item"
        :class="{ 'is-dragging': dragIndex === index }"
        draggable="true"
        @dragstart="onDragStart(index, $event)"
        @dragover.prevent="onDragOver(index)"
        @drop.prevent="onDrop(index)"
        @dragend="onDragEnd"
      >
        <img
          class="device-land-sort-dialog__img"
          :src="outletIcon"
          alt=""
        />
        <div class="device-land-sort-dialog__info">
          <div class="device-land-sort-dialog__name-row">
            <span class="device-land-sort-dialog__name">{{ item.name || '出水桩' }}</span>
            <span class="device-land-sort-dialog__type">——出水桩</span>
          </div>
          <div class="device-land-sort-dialog__code">{{ item.deviceCode || '--' }}</div>
        </div>
        <span class="device-land-sort-dialog__index">{{ index + 1 }}</span>
        <el-icon class="device-land-sort-dialog__handle"><Operation /></el-icon>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Operation } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { deviceSort, getDeviceList } from '@/api/device'
import outletIcon from '@/assets/map/outlet-device-online.svg'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  farmId: { type: [Number, String], default: null },
  landId: { type: [Number, String], default: null },
  /** 出水桩固定 50 */
  devType: { type: [Number, String], default: 50 }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const loading = ref(false)
const saving = ref(false)
const deviceList = ref([])
const dragIndex = ref(null)

function onVisibleChange(v) {
  emit('update:modelValue', v)
}

async function fetchList() {
  if (props.farmId == null || props.landId == null) {
    deviceList.value = []
    return
  }
  loading.value = true
  try {
    const res = await getDeviceList({
      farmId: props.farmId,
      landId: props.landId,
      devType: props.devType
    })
    deviceList.value = Array.isArray(res?.data) ? res.data.map((d) => ({ ...d })) : []
  } catch (e) {
    console.error('[DeviceLandSortDialog] 获取设备列表失败', e)
    deviceList.value = []
  } finally {
    loading.value = false
  }
}

function applySortOrder() {
  deviceList.value.forEach((item, index) => {
    item.groupIndex = index
    item.sortOrder = index
  })
}

function onDragStart(index, e) {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(index) {
  if (dragIndex.value == null || dragIndex.value === index) return
  const list = [...deviceList.value]
  const [moved] = list.splice(dragIndex.value, 1)
  list.splice(index, 0, moved)
  deviceList.value = list
  dragIndex.value = index
}

function onDrop() {
  applySortOrder()
}

function onDragEnd() {
  dragIndex.value = null
  applySortOrder()
}

async function saveOrder() {
  if (!deviceList.value.length) {
    ElMessage.warning('列表为空')
    return
  }
  applySortOrder()
  saving.value = true
  try {
    await deviceSort({ items: deviceList.value }, { loading: true })
    ElMessage.success('操作成功')
    emit('saved')
    emit('update:modelValue', false)
  } catch (e) {
    console.error('[DeviceLandSortDialog] 保存排序失败', e)
    ElMessage.error(e?.message || '保存排序失败')
  } finally {
    saving.value = false
  }
}

watch(
  () => [props.modelValue, props.landId],
  ([visible]) => {
    if (visible) fetchList()
  }
)
</script>

<style scoped>
.device-land-sort-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px;
}

.device-land-sort-dialog__title {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.device-land-sort-dialog__body {
  min-height: 200px;
  max-height: 50vh;
  overflow-y: auto;
}

.device-land-sort-dialog__empty {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.device-land-sort-dialog__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 40px 12px 12px;
  border-top: 1px solid #ebeef5;
  cursor: grab;
  user-select: none;
}

.device-land-sort-dialog__item.is-dragging {
  opacity: 0.6;
  background: #f5f7fa;
}

.device-land-sort-dialog__img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  flex-shrink: 0;
}

.device-land-sort-dialog__info {
  flex: 1;
  min-width: 0;
}

.device-land-sort-dialog__name-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.device-land-sort-dialog__name {
  font-weight: 700;
  color: #303133;
}

.device-land-sort-dialog__type {
  color: #606266;
}

.device-land-sort-dialog__code {
  margin-top: 4px;
  font-size: 13px;
  color: #3653a0;
}

.device-land-sort-dialog__index {
  position: absolute;
  top: 8px;
  right: 36px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #3653a0;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.device-land-sort-dialog__handle {
  position: absolute;
  right: 12px;
  font-size: 18px;
  color: #909399;
  cursor: grab;
}
</style>
