<template>
  <div
    v-if="visible"
    class="land-edit-popup"
    @click.stop
    @mousedown.stop
  >
    <div class="land-edit-popup__header">
      <button
        type="button"
        class="land-edit-popup__back"
        title="返回"
        @click="onBack"
      >
        <i class="iconfont icon-farm_ic_back"></i>
      </button>
      <h3 class="land-edit-popup__title">编辑地块</h3>
      <button
        type="button"
        class="land-edit-popup__close"
        title="关闭"
        @click="onClose"
      >
        <i class="iconfont icon-shanchu"></i>
      </button>
    </div>

    <div class="land-edit-popup__form">
      <label class="land-edit-popup__field">
        <span class="land-edit-popup__label">地块名称</span>
        <input
          v-model="formName"
          class="land-edit-popup__input"
          type="text"
          placeholder="如：试验田"
          maxlength="50"
        />
      </label>

      <div class="land-edit-popup__field">
        <span class="land-edit-popup__label">地块区域</span>
        <button
          type="button"
          class="land-edit-popup__area"
          @click="onAreaClick"
        >
          <span class="land-edit-popup__area-text">{{ areaDisplay }}</span>
          <i class="iconfont icon-zuo land-edit-popup__area-arrow"></i>
        </button>
      </div>
    </div>

    <div class="land-edit-popup__actions">
      <button
        type="button"
        class="land-edit-popup__btn land-edit-popup__btn--danger"
        @click="onDelete"
      >
        删除
      </button>
      <button
        type="button"
        class="land-edit-popup__btn land-edit-popup__btn--primary"
        @click="onSave"
      >
        保存
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /**
   * 编辑载荷：{ id, name, areaMu, deviceCount, land? }
   */
  landEdit: { type: Object, default: null }
})

const emit = defineEmits([
  'update:modelValue',
  'close',
  'back',
  'delete',
  'save',
  'edit-area'
])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const formName = ref('')

watch(
  () => [props.modelValue, props.landEdit],
  ([open, data]) => {
    if (open && data) {
      formName.value = data.name || ''
    }
  },
  { immediate: true }
)

const areaDisplay = computed(() => {
  const mu = props.landEdit?.areaMu
  if (mu == null || mu === '') return '0.00亩'
  return `${mu}亩`
})

const buildPayload = () => ({
  id: props.landEdit?.id,
  name: formName.value?.trim() || '',
  areaMu: props.landEdit?.areaMu,
  deviceCount: props.landEdit?.deviceCount ?? 0,
  land: props.landEdit?.land || null
})

const onClose = () => {
  visible.value = false
  emit('close')
}

const onBack = () => {
  visible.value = false
  emit('back', buildPayload())
}

const onAreaClick = () => {
  emit('edit-area', buildPayload())
}

const onDelete = () => {
  emit('delete', buildPayload())
}

const onSave = () => {
  emit('save', buildPayload())
}
</script>

<style scoped>
.land-edit-popup {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1210;
  width: 360px;
  box-sizing: border-box;
  padding: 14px 16px 16px;
  border-radius: 12px;
  background: rgba(245, 246, 248, 0.94);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16);
  pointer-events: auto;
}

.land-edit-popup__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.land-edit-popup__back,
.land-edit-popup__close {
  border: none;
  background: transparent;
  color: #c0c4cc;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}

.land-edit-popup__back {
  color: #606266;
}

.land-edit-popup__back .iconfont,
.land-edit-popup__close .iconfont {
  font-size: 18px;
}

.land-edit-popup__back:hover {
  color: #303133;
}

.land-edit-popup__close:hover {
  color: #909399;
}

.land-edit-popup__title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
}

.land-edit-popup__form {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.land-edit-popup__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.land-edit-popup__label {
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
}

.land-edit-popup__input,
.land-edit-popup__area {
  width: 100%;
  height: 42px;
  box-sizing: border-box;
  padding: 0 14px;
  border: none;
  border-radius: 10px;
  background: #fff;
  font-size: 14px;
  color: #1a1a1a;
  outline: none;
}

.land-edit-popup__input::placeholder {
  color: #c0c4cc;
}

.land-edit-popup__area {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  text-align: left;
}

.land-edit-popup__area:hover {
  background: #fafafa;
}

.land-edit-popup__area-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.land-edit-popup__area-arrow {
  flex-shrink: 0;
  margin-left: 8px;
  color: #c0c4cc;
  font-size: 14px;
  transform: rotate(180deg);
}

.land-edit-popup__actions {
  margin-top: 18px;
  display: flex;
  gap: 12px;
}

.land-edit-popup__btn {
  flex: 1;
  height: 40px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.land-edit-popup__btn--danger {
  background: #f56c6c;
  color: #fff;
}

.land-edit-popup__btn--danger:hover {
  background: #e85c5c;
}

.land-edit-popup__btn--primary {
  background: #2f6bff;
  color: #fff;
}

.land-edit-popup__btn--primary:hover {
  background: #2560e8;
}
</style>
