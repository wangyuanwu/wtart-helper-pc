<template>
  <el-dialog
    v-model="visible"
    title="轮灌溉组选择"
    width="480px"
    append-to-body
    :close-on-click-modal="false"
    class="group-chose-dialog"
  >
    <div v-if="!irrigationList.length" class="group-chose-dialog__empty">
      暂无可选轮灌组
    </div>
    <el-checkbox-group v-else v-model="checkedIds" class="group-chose-dialog__list">
      <label
        v-for="item in irrigationList"
        :key="item.id"
        class="group-chose-dialog__item"
      >
        <el-checkbox :label="item.id">{{ item.name }}</el-checkbox>
      </label>
    </el-checkbox-group>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="confirmSelect">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['confirm'])

const visible = ref(false)
const irrigationList = ref([])
const checkedIds = ref([])

function open(list = [], ids = []) {
  irrigationList.value = Array.isArray(list) ? list.map((item) => ({ ...item })) : []
  checkedIds.value = [...ids]
  visible.value = true
}

function confirmSelect() {
  emit('confirm', [...checkedIds.value])
  visible.value = false
}

defineExpose({ open })
</script>

<style scoped>
.group-chose-dialog__empty {
  padding: 24px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.group-chose-dialog__list {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 400px;
  overflow: auto;
}

.group-chose-dialog__item {
  display: flex;
  align-items: center;
  padding: 14px 4px;
  border-bottom: 1px solid #edf1f7;
  cursor: pointer;
}

.group-chose-dialog__item:last-child {
  border-bottom: none;
}
</style>
