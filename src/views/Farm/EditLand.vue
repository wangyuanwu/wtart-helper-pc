<template>
  <div class="farm-edit-land-page">
    <div class="farm-edit-land-page__head">
      <button type="button" class="farm-edit-land-page__back" @click="onBack">
        ← 返回
      </button>
      <h1 class="farm-edit-land-page__title">编辑地块</h1>
    </div>

    <div v-if="landInfo" class="farm-edit-land-card">
      <div class="farm-edit-land-field">
        <label class="farm-edit-land-field__label">地块名称</label>
        <div class="farm-edit-land-field__wrap">
          <input
            v-model="landInfo.name"
            class="farm-edit-land-field__input"
            type="text"
            placeholder="请输入地块名称"
            maxlength="50"
          />
        </div>
      </div>

      <button
        type="button"
        class="farm-edit-land-row is-clickable"
        @click="onClickArea"
      >
        <span class="farm-edit-land-row__label">地块区域</span>
        <span class="farm-edit-land-row__value">
          {{ areaText }}
          <i class="iconfont icon-xiala farm-edit-land-row__arrow"></i>
        </span>
      </button>

      <div class="farm-edit-land-row">
        <span class="farm-edit-land-row__label">设备数量</span>
        <span class="farm-edit-land-row__value">{{ deviceCountText }}</span>
      </div>
    </div>

    <div v-else class="farm-edit-land-empty">地块数据缺失，请返回重试</div>

    <div v-if="landInfo" class="farm-edit-land-footer">
      <button
        type="button"
        class="farm-edit-land-footer__btn is-danger"
        :disabled="saving"
        @click="onDelete"
      >
        删除地块
      </button>
      <button
        type="button"
        class="farm-edit-land-footer__btn is-primary"
        :disabled="saving"
        @click="onSave"
      >
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * 农场设置独立地块编辑页
 * 对齐移动端 pages/home/activity/land/add-edit-land?type=edit
 * 数据载体：farmStore.s_land（对齐移动端 vuex_land）
 * 与地图页 LandEditPopup 编辑流程互不共用
 */
import { computed, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteLand, updateLand } from '@/api/map'
import { useFarmStore } from '@/store/farm'
import { formatAreaMu } from '@/utils/farmMapData'

const router = useRouter()
const farmStore = useFarmStore()

const landInfo = ref(null)
const saving = ref(false)

const areaText = computed(() => {
  const mu = formatAreaMu(landInfo.value?.area)
  return mu != null ? `${mu}亩` : '--'
})

const deviceCountText = computed(() => {
  const ids = landInfo.value?.deviceIds
  const n = Array.isArray(ids) ? ids.length : 0
  return `${n}个`
})

function syncFromStore() {
  const draft = farmStore.s_land
  if (!draft?.id) {
    landInfo.value = null
    return
  }
  landInfo.value = {
    ...draft,
    name: draft.name || draft.landName || '',
    deviceIds: Array.isArray(draft.deviceIds) ? [...draft.deviceIds] : []
  }
}

function onBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/farm/edit')
}

/** 对齐移动端 onClickArea → map-edit-plot?type=edit */
function onClickArea() {
  if (!landInfo.value?.id) return
  // 回写当前表单到 store，供圈地页读取元数据
  farmStore.setLand({ ...landInfo.value })
  router.push({
    path: '/map/edit-plot',
    query: {
      type: 'edit',
      landId: String(landInfo.value.id),
      from: 'farm-edit-land'
    }
  })
}

async function onSave() {
  if (!landInfo.value?.id || saving.value) return
  const name = (landInfo.value.name || '').trim()
  if (!name) {
    ElMessage.warning('请输入地块名称')
    return
  }
  const farmId = farmStore.selectFarm?.id
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    return
  }

  saving.value = true
  try {
    await updateLand({
      id: landInfo.value.id,
      farmId,
      name,
      area: landInfo.value.area,
      areaJson: landInfo.value.areaJson,
      address: landInfo.value.address,
      longitude: landInfo.value.longitude,
      latitude: landInfo.value.latitude,
      coordinateType: landInfo.value.coordinateType,
      deviceIds: landInfo.value.deviceIds || []
    })
    ElMessage.success('操作成功')
    farmStore.setLand(null)
    farmStore.farmChange()
    setTimeout(() => router.replace('/farm/edit'), 600)
  } catch (e) {
    console.error('[FarmEditLand] 保存地块失败', e)
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  if (!landInfo.value?.id || saving.value) return
  try {
    await ElMessageBox.confirm('请确认是否删除地块？', '删除地块', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    })
    saving.value = true
    await deleteLand(landInfo.value.id)
    ElMessage.success('操作成功')
    farmStore.setLand(null)
    farmStore.farmChange()
    setTimeout(() => router.replace('/farm/edit'), 600)
  } catch (e) {
    if (e !== 'cancel' && e?.message !== 'cancel') {
      console.error('[FarmEditLand] 删除地块失败', e)
    }
  } finally {
    saving.value = false
  }
}

onMounted(syncFromStore)
onActivated(syncFromStore)
</script>

<style scoped>
.farm-edit-land-page {
  min-height: 100%;
  padding: 24px 28px 100px;
  background: #f3f4f6;
  box-sizing: border-box;
}

.farm-edit-land-page__head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.farm-edit-land-page__back {
  border: none;
  background: #fff;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  color: #555;
  font-size: 14px;
}

.farm-edit-land-page__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #111;
}

.farm-edit-land-card {
  background: #fff;
  border-radius: 12px;
  padding: 8px 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.farm-edit-land-field {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.farm-edit-land-field__label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #888;
}

.farm-edit-land-field__wrap {
  display: flex;
  align-items: center;
  background: #f5f6f8;
  border-radius: 10px;
  padding: 0 12px;
}

.farm-edit-land-field__input {
  flex: 1;
  border: none;
  background: transparent;
  height: 44px;
  font-size: 15px;
  outline: none;
}

.farm-edit-land-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 18px 20px;
  border: none;
  border-bottom: 1px solid #f0f0f0;
  background: transparent;
  text-align: left;
  box-sizing: border-box;
}

.farm-edit-land-row.is-clickable {
  cursor: pointer;
}

.farm-edit-land-row.is-clickable:hover {
  background: #fafafa;
}

.farm-edit-land-row__label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.farm-edit-land-row__value {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #666;
}

.farm-edit-land-row__arrow {
  font-size: 12px;
  color: #c0c4cc;
  transform: rotate(-90deg);
}

.farm-edit-land-empty {
  padding: 80px;
  text-align: center;
  color: #999;
  background: #fff;
  border-radius: 12px;
}

.farm-edit-land-footer {
  position: fixed;
  left: 200px;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 16px 24px;
  background: #fff;
  border-top: 1px solid #eee;
  z-index: 10;
}

.farm-edit-land-footer__btn {
  min-width: 160px;
  height: 44px;
  border-radius: 8px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.farm-edit-land-footer__btn.is-primary {
  background: #1e3a8a;
  color: #fff;
}

.farm-edit-land-footer__btn.is-danger {
  background: #fff;
  color: #ef4444;
  border: 1px solid #fecaca;
}

.farm-edit-land-footer__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
