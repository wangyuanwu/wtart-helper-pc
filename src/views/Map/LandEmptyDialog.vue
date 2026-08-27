<template>
  <el-dialog
    v-model="visible"
    width="600px"
    align-center
    :show-close="false"
    :close-on-click-modal="false"
    :append-to-body="true"
    class="land-empty-dialog"
    modal-class="land-empty-dialog-modal"
  >
    <div class="land-empty-panel">
      <button
        type="button"
        class="land-empty-close"
        title="关闭"
        @click.stop="closeDialog"
      >
        ×
      </button>

      <div class="land-empty-upper">
        <h3 class="land-empty-heading">提示</h3>
        <p class="land-empty-title">当前农场还没有地块，请新建地块</p>
        <p class="land-empty-desc">
          （原则上以一个灌溉水泵的覆盖区域为一个地块，比如你的农场有三台独立的灌溉水泵，那么就应该在对应的灌溉区域，建立三个地块）
        </p>
      </div>

      <div class="land-empty-lower">
        <button
          type="button"
          class="land-empty-btn"
          @click="handleCreateLand"
        >
          新建地块
        </button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'create', 'close'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit('update:modelValue', val)
    if (!val) emit('close')
  }
})

const closeDialog = () => {
  visible.value = false
}

const handleCreateLand = () => {
  emit('create')
  closeDialog()
}
</script>

<style scoped>
.land-empty-panel {
  position: relative;
  width: 600px;
  max-width: 600px;
  height: 434px;
  border-radius: 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
}

.land-empty-close {
  position: absolute;
  top: 14px;
  right: 16px;
  z-index: 2;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #909399;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.land-empty-close:hover {
  color: #606266;
}

.land-empty-upper {
  flex: none;
  width: 100%;
  height: 320px;
  padding: 48px 48px 24px;
  box-sizing: border-box;
  background: rgba(223, 225, 221, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.land-empty-heading {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.4;
}

.land-empty-title {
  margin: 36px 0 0;
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.5;
}

.land-empty-desc {
  margin: 20px 0 0;
  max-width: 460px;
  font-size: 14px;
  font-weight: 700;
  color: #8c8c8c;
  line-height: 1.7;
  text-align: left;
}

.land-empty-lower {
  flex: none;
  width: 100%;
  height: 114px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.land-empty-btn {
  min-width: 220px;
  height: 44px;
  padding: 0 32px;
  border: none;
  border-radius: 22px;
  background: #2755a0;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.land-empty-btn:hover {
  background: #1f478a;
}

.land-empty-btn:active {
  background: #1a3d78;
}
</style>

<style>
/* 去掉 el-dialog 默认白底/内边距；保留 margin:auto 才能配合 align-center 垂直居中 */
.land-empty-dialog.el-dialog {
  width: 600px !important;
  max-width: 600px !important;
  height: auto !important;
  margin: auto !important;
  padding: 0 !important;
  border: none !important;
  border-radius: 24px !important;
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
  overflow: visible !important;
}

.land-empty-dialog .el-dialog__header {
  display: none !important;
}

.land-empty-dialog .el-dialog__body {
  padding: 0 !important;
  margin: 0 !important;
  background: transparent !important;
  background-color: transparent !important;
}

.land-empty-dialog .el-dialog__footer {
  display: none !important;
}

/* 遮罩层内做 flex 居中，避免仅靠 margin 在部分布局下失效 */
.el-overlay:has(.land-empty-dialog) .el-overlay-dialog {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
</style>
