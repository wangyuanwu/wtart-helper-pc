<template>
  <el-dialog
    :model-value="modelValue"
    width="520px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    class="group-order-dialog"
    @update:model-value="onVisibleChange"
  >
    <template #header>
      <div class="group-order-dialog__header">
        <span class="group-order-dialog__title">轮灌组排序</span>
        <el-button type="primary" link :loading="saving" @click="saveOrder">
          保存排序
        </el-button>
      </div>
    </template>

    <div v-loading="loading" class="group-order-dialog__body">
      <div
        v-if="!groupList.length && !loading"
        class="group-order-dialog__empty"
      >
        没有发现轮灌组
      </div>

      <div
        v-for="(item, index) in groupList"
        :key="item.id"
        class="group-order-dialog__item"
        :class="{ 'is-dragging': dragIndex === index }"
        draggable="true"
        @dragstart="onDragStart(index, $event)"
        @dragover.prevent="onDragOver(index)"
        @drop.prevent="onDrop"
        @dragend="onDragEnd"
      >
        <div class="group-order-dialog__name">{{ item.name || '未命名轮灌组' }}</div>
        <span class="group-order-dialog__index">{{ index + 1 }}</span>
        <el-icon class="group-order-dialog__handle"><Operation /></el-icon>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Operation } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getGroupListByLand, groupSort } from '@/api/irrigationGroup'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  farmId: { type: [Number, String], default: null },
  landId: { type: [Number, String], default: null }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const loading = ref(false)
const saving = ref(false)
const groupList = ref([])
const dragIndex = ref(null)

function onVisibleChange(v) {
  emit('update:modelValue', v)
}

async function fetchList() {
  if (props.farmId == null || props.landId == null) {
    groupList.value = []
    return
  }
  loading.value = true
  try {
    const res = await getGroupListByLand({ farmId: props.farmId })
    const landList = Array.isArray(res?.data) ? res.data : []
    const land = landList.find(
      (item) => String(item.landId) === String(props.landId)
    )
    groupList.value = Array.isArray(land?.groups)
      ? land.groups.map((g) => ({ ...g }))
      : []
  } catch (e) {
    console.error('[GroupOrderDialog] 获取轮灌组列表失败', e)
    groupList.value = []
  } finally {
    loading.value = false
  }
}

function applySortOrder() {
  groupList.value.forEach((item, index) => {
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
  const list = [...groupList.value]
  const [moved] = list.splice(dragIndex.value, 1)
  list.splice(index, 0, moved)
  groupList.value = list
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
  if (!groupList.value.length) {
    ElMessage.warning('列表为空')
    return
  }
  applySortOrder()
  saving.value = true
  try {
    await groupSort({ items: groupList.value }, { loading: true })
    ElMessage.success('操作成功')
    emit('saved')
    emit('update:modelValue', false)
  } catch (e) {
    console.error('[GroupOrderDialog] 保存排序失败', e)
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
.group-order-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px;
}

.group-order-dialog__title {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.group-order-dialog__body {
  min-height: 200px;
  max-height: 50vh;
  overflow-y: auto;
}

.group-order-dialog__empty {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.group-order-dialog__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 40px 16px 16px;
  border-top: 1px solid #ebeef5;
  cursor: grab;
  user-select: none;
}

.group-order-dialog__item.is-dragging {
  opacity: 0.6;
  background: #f5f7fa;
}

.group-order-dialog__name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 700;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-order-dialog__index {
  position: absolute;
  top: 12px;
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

.group-order-dialog__handle {
  position: absolute;
  right: 12px;
  font-size: 18px;
  color: #909399;
  cursor: grab;
}
</style>
