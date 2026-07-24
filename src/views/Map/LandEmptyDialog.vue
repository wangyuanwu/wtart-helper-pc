<template>
  <el-dialog
    v-model="visible"
    title="提示"
    width="420px"
    align-center
    :close-on-click-modal="false"
    :append-to-body="true"
    class="land-empty-dialog"
  >
    <div class="land-empty-body">
      <p class="land-empty-title">当前农场还没有地块，请新建地块</p>
      <p class="land-empty-desc">
        （原则上以一个灌溉水泵的覆盖区域为一个地块，比如你的农场有三台独立的灌溉水泵，那么就应该在对应的灌溉区域，建立三个地块）
      </p>
    </div>
    <template #footer>
      <div class="land-empty-footer">
        <button
          type="button"
          class="land-empty-btn"
          @click="handleCreateLand"
        >
          新建地块
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'create'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const handleCreateLand = () => {
  emit('create')
  // PC 端新建地块页尚未接入，先预留出口
  ElMessage.info('新建地块功能开发中')
  visible.value = false
}
</script>

<style scoped>
.land-empty-body {
  padding: 4px 8px 8px;
  text-align: center;
}

.land-empty-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.5;
}

.land-empty-desc {
  margin: 12px 0 0;
  font-size: 13px;
  color: #999;
  line-height: 1.6;
  text-align: left;
}

.land-empty-footer {
  display: flex;
  justify-content: center;
  padding: 4px 0 8px;
}

.land-empty-btn {
  min-width: 200px;
  height: 40px;
  padding: 0 28px;
  border: none;
  border-radius: 20px;
  background: #3377ff;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(51, 119, 255, 0.35);
}

.land-empty-btn:hover {
  background: #2868e8;
}

.land-empty-btn:active {
  background: #1f5ad6;
}
</style>

<style>
.land-empty-dialog .el-dialog__header {
  text-align: center;
  margin-right: 0;
  padding-bottom: 8px;
}

.land-empty-dialog .el-dialog__title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.land-empty-dialog .el-dialog__body {
  padding: 8px 24px 4px;
}

.land-empty-dialog .el-dialog__footer {
  padding: 12px 20px 20px;
  background: #f7f8fa;
  border-radius: 0 0 8px 8px;
}
</style>
