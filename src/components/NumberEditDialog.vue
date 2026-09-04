<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="400px"
    append-to-body
    align-center
    :close-on-click-modal="false"
    class="number-edit-dialog"
    @closed="onClosed"
  >
    <p class="number-edit-dialog__range" :class="{ 'is-error': !isPass }">
      {{ tipText }}
    </p>
    <div class="number-edit-dialog__field">
      <input
        ref="inputRef"
        v-model="inputValue"
        class="number-edit-dialog__input"
        type="text"
        inputmode="decimal"
        :placeholder="placeholder"
        @keyup.enter="onConfirm"
      />
      <span v-if="unit" class="number-edit-dialog__unit">{{ unit }}</span>
    </div>
    <template #footer>
      <div class="number-edit-dialog__footer">
        <button type="button" class="number-edit-dialog__btn is-cancel" @click="onCancel">
          取消
        </button>
        <button type="button" class="number-edit-dialog__btn is-confirm" @click="onConfirm">
          确定
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
/**
 * 数字编辑弹窗，对齐移动端 components/number-edit-dialog
 * open(value, { title, unit, min, max, numType, savePoint })
 */
import { computed, nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['confirm', 'cancel'])

const visible = ref(false)
const title = ref('')
const unit = ref('')
const min = ref(0)
const max = ref(100)
const numType = ref('float')
const savePoint = ref(2)
const inputValue = ref('')
const placeholder = ref('')
const isPass = ref(true)
const inputRef = ref(null)

let callback = null

const tipText = computed(() => `可输入范围:${min.value}-${max.value}`)

function open(currentValue, options = {}, onConfirm) {
  title.value = options.title || '请输入'
  unit.value = options.unit || ''
  min.value = Number(options.min ?? 0)
  max.value = Number(options.max ?? 100)
  numType.value = options.numType || 'float'
  savePoint.value = Number(options.savePoint ?? 2)
  const raw = currentValue == null || currentValue === '' ? '' : String(currentValue)
  placeholder.value = raw
  inputValue.value = ''
  isPass.value = true
  callback = onConfirm
  visible.value = true
  nextTick(() => {
    setTimeout(() => inputRef.value?.focus?.(), 200)
  })
}

function onCancel() {
  emit('cancel')
  visible.value = false
}

function onConfirm() {
  if (inputValue.value === '' || inputValue.value == null) {
    isPass.value = false
    return
  }
  let num = Number(inputValue.value)
  if (!Number.isFinite(num)) {
    isPass.value = false
    ElMessage.warning(tipText.value)
    return
  }
  if (num < min.value || num > max.value) {
    isPass.value = false
    ElMessage.warning(tipText.value)
    return
  }
  if (numType.value === 'int') {
    num = parseInt(num, 10)
  } else {
    num = Number(parseFloat(num).toFixed(savePoint.value))
  }
  isPass.value = true
  callback?.(num)
  emit('confirm', { value: num })
  visible.value = false
}

function onClosed() {
  callback = null
  inputValue.value = ''
}

defineExpose({ open })
</script>

<style scoped>
.number-edit-dialog__range {
  margin: 0 0 12px;
  font-size: 13px;
  color: #9ca3af;
}

.number-edit-dialog__range.is-error {
  color: #f53f3f;
  font-weight: 700;
  font-size: 14px;
}

.number-edit-dialog__field {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #ebebeb;
  border-radius: 8px;
}

.number-edit-dialog__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  height: 28px;
  font-size: 15px;
  color: #111;
}

.number-edit-dialog__unit {
  flex-shrink: 0;
  font-size: 13px;
  color: #9ca3af;
}

.number-edit-dialog__footer {
  display: flex;
  gap: 12px;
  width: 100%;
}

.number-edit-dialog__btn {
  flex: 1;
  height: 40px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.number-edit-dialog__btn.is-cancel {
  background: #f3f4f6;
  color: #6b7280;
}

.number-edit-dialog__btn.is-confirm {
  background: #274082;
  color: #fff;
}
</style>

<style>
.number-edit-dialog.el-dialog {
  border-radius: 12px;
  overflow: hidden;
}
</style>
