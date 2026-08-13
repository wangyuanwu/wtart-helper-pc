<template>
  <el-dialog
    v-model="visible"
    width="420px"
    align-center
    :show-close="true"
    :append-to-body="true"
    title="修改昵称"
    class="edit-nickname-dialog"
    modal-class="edit-nickname-dialog-modal"
    @closed="handleClosed"
  >
    <div class="edit-nickname">
      <el-input
        ref="inputRef"
        v-model="nicknameInput"
        maxlength="32"
        placeholder="请输入昵称"
        clearable
        @keyup.enter="handleConfirm"
      />
    </div>
    <template #footer>
      <div class="edit-nickname__footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleConfirm">
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
/**
 * 修改昵称弹窗
 * 对齐移动端 my-edit-dialog + my.vue changeNickName
 */
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  nickname: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const inputRef = ref(null)
const nicknameInput = ref('')
const submitting = ref(false)

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    nicknameInput.value = props.nickname || ''
    submitting.value = false
    await nextTick()
    inputRef.value?.focus?.()
  }
)

function handleCancel() {
  visible.value = false
}

function handleClosed() {
  nicknameInput.value = ''
  submitting.value = false
}

function handleConfirm() {
  const name = String(nicknameInput.value || '').trim()
  if (!name) {
    ElMessage.warning('请输入昵称')
    return
  }
  submitting.value = true
  emit('confirm', name)
}

function resetSubmitting() {
  submitting.value = false
}

defineExpose({ resetSubmitting })
</script>

<style scoped>
.edit-nickname {
  padding: 4px 0 8px;
}

.edit-nickname__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

<style>
.edit-nickname-dialog.el-dialog {
  border-radius: 12px;
  overflow: hidden;
}

.edit-nickname-dialog .el-dialog__header {
  margin: 0;
  padding: 16px 20px 8px;
}

.edit-nickname-dialog .el-dialog__title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.edit-nickname-dialog .el-dialog__body {
  padding: 0 20px 8px;
}

.edit-nickname-dialog .el-dialog__footer {
  padding: 8px 20px 16px;
}
</style>
