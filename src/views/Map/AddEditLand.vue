<template>
  <div class="add-edit-land-page">
    <div class="add-edit-land-top">
      <h2 class="add-edit-land-top__title">{{ pageTitle }}</h2>
      <button type="button" class="add-edit-land-back" @click="onBack">
        <span class="add-edit-land-back__arrow">←</span>
        返回
      </button>
    </div>

    <div v-if="landInfo" class="add-edit-land-body">
      <div class="add-edit-land-field">
        <label class="add-edit-land-field__label">
          地块名称<span class="is-required">*</span>
        </label>
        <input
          v-model="landName"
          class="add-edit-land-field__input"
          type="text"
          placeholder="请输入地块名称"
          maxlength="50"
        />
      </div>

      <div class="add-edit-land-row">
        <span class="add-edit-land-row__label">地块区域</span>
        <span class="add-edit-land-row__value">{{ areaText }}</span>
      </div>

      <div class="add-edit-land-row">
        <span class="add-edit-land-row__label">设备数量</span>
        <span class="add-edit-land-row__value">{{ deviceCountText }}</span>
      </div>
    </div>

    <div v-else class="add-edit-land-empty">暂无地块草稿，请先圈定地块</div>

    <div class="add-edit-land-footer">
      <button
        type="button"
        class="add-edit-land-footer__btn"
        :disabled="saving || !landInfo"
        @click="addPlotHttp"
      >
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useFarmStore } from '@/store/farm'
import { addPlot } from '@/api/map'

const route = useRoute()
const router = useRouter()
const farmStore = useFarmStore()

const pageType = computed(() => route.query.type || 'add')
const pageTitle = computed(() =>
  pageType.value === 'edit' ? '编辑地块' : '新建地块'
)

const landInfo = ref(null)
const landName = ref('')
const saving = ref(false)
const landInfoAreaJson = ref(null)

const areaText = computed(() => {
  const mu = landInfo.value?.areaMu
  return mu != null && mu !== '' ? `${mu}亩` : '--'
})

const deviceCountText = computed(() => {
  const ids = landInfo.value?.deviceIds
  const n = Array.isArray(ids) ? ids.length : 0
  return `${n}个`
})

const onBack = () => {
  if (window.history.length > 1) router.back()
  else router.replace('/map')
}

/** 对齐移动端 addPlotHttp */
const addPlotHttp = async () => {
  const name = landName.value.trim()
  if (!name) {
    ElMessage.warning('请输入地块名称')
    return
  }
  if (!landInfo.value) {
    ElMessage.warning('地块数据缺失，请返回重新圈地')
    return
  }
  const farmId = farmStore.selectFarm?.id
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    return
  }

  saving.value = true
  try {
    const res = await addPlot({
      farmId,
      name,
      area: landInfo.value.areaMu,
      areaJson: JSON.stringify(landInfoAreaJson.value),
      address: landInfo.value.address,
      longitude: landInfo.value.lng,
      latitude: landInfo.value.lat,
      coordinateType: 1,
      deviceIds: landInfo.value.deviceIds || []
    })
    if (res?.code === 200) {
      ElMessage.success('操作成功')
      farmStore.setLand(null)
      setTimeout(() => {
        router.replace('/map')
      }, 800)
    }
  } catch (e) {
    console.error('[AddEditLand] 新建地块失败', e)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  const draft = farmStore.s_land
  if (!draft) {
    ElMessage.warning('请先圈定地块范围')
    return
  }
  landInfo.value = { ...draft }
  landName.value = draft.landName || ''
  landInfoAreaJson.value = {
    landPoint: draft.landPoint,
    fillColor: draft.fillColor
  }
})
</script>

<style scoped>
.add-edit-land-page {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.add-edit-land-top {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.add-edit-land-top__title {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
  color: #0f172a;
}

.add-edit-land-back {
  height: 36px;
  padding: 0 14px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  color: #606266;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.add-edit-land-back:hover {
  border-color: #3653a0;
  color: #3653a0;
}

.add-edit-land-back__arrow {
  font-size: 16px;
  line-height: 1;
}

.add-edit-land-body {
  flex: 1;
  min-height: 0;
  margin: 16px 24px;
  padding: 8px 0;
  border-radius: 12px;
  background: #fff;
  overflow: auto;
}

.add-edit-land-field {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f2f5;
}

.add-edit-land-field__label {
  display: block;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.add-edit-land-field__label .is-required {
  margin-left: 2px;
  color: #f56c6c;
}

.add-edit-land-field__input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: none;
  border-radius: 10px;
  background: #f5f7fa;
  font-size: 14px;
  color: #0f172a;
  outline: none;
  box-sizing: border-box;
}

.add-edit-land-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid #f0f2f5;
}

.add-edit-land-row__label {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.add-edit-land-row__value {
  font-size: 14px;
  color: #606266;
}

.add-edit-land-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.add-edit-land-footer {
  flex-shrink: 0;
  padding: 16px 24px;
  background: #fff;
  border-top: 1px solid #edf1f7;
  display: flex;
  justify-content: center;
}

.add-edit-land-footer__btn {
  min-width: 280px;
  height: 44px;
  border: none;
  border-radius: 10px;
  background: #2755a0;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.add-edit-land-footer__btn:hover:not(:disabled) {
  background: #1f478a;
}

.add-edit-land-footer__btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
