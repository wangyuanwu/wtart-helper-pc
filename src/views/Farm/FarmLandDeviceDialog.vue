<template>
  <el-dialog
    :model-value="modelValue"
    width="720px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    class="farm-land-device-dialog"
    @update:model-value="onVisibleChange"
  >
    <template #header>
      <div class="farm-land-device-dialog__title">智能出水桩</div>
    </template>

    <div class="farm-land-device-dialog__search">
      <el-input
        v-model="searchText"
        clearable
        placeholder="输入设备名称/设备编号"
        @keyup.enter="fetchList"
        @clear="fetchList"
      >
        <template #prefix>
          <i class="iconfont icon-farm_ic_search"></i>
        </template>
      </el-input>
      <el-button type="primary" :loading="loading" @click="fetchList">
        搜索
      </el-button>
    </div>

    <div v-loading="loading" class="farm-land-device-dialog__table-wrap">
      <el-table
        ref="tableRef"
        :data="deviceList"
        row-key="id"
        height="360"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column label="设备" min-width="220">
          <template #default="{ row }">
            <div class="farm-land-device-dialog__device">
              <img
                class="farm-land-device-dialog__device-img"
                :src="outletIcon"
                alt=""
              />
              <span class="farm-land-device-dialog__device-name">
                {{ row.name || '出水桩' }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="deviceCode"
          label="编号"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <button
              type="button"
              class="farm-land-device-dialog__trash"
              title="删除"
              @click.stop="onDeleteOne(row)"
            >
              <i class="iconfont icon-device_ic_delete"></i>
            </button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="farm-land-device-dialog__empty">没有发现设备</div>
        </template>
      </el-table>
    </div>

    <template #footer>
      <el-button type="primary" :loading="deleting" @click="onFooterPrimary">
        保存
      </el-button>
    </template>

    <!-- 删除确认（对齐移动端 a-tip-sure + 设计稿图2） -->
    <el-dialog
      v-model="confirmVisible"
      title="提示"
      width="420px"
      append-to-body
      :close-on-click-modal="false"
      @closed="onConfirmClosed"
    >
      <p class="farm-land-device-dialog__confirm-desc">
        删除后不能操作该设备，是否继续？
      </p>
      <el-checkbox v-model="riskChecked">
        已知晓风险，确定要删除。
      </el-checkbox>
      <template #footer>
        <el-button @click="confirmVisible = false">取消</el-button>
        <el-button
          type="danger"
          :disabled="!riskChecked"
          :loading="deleting"
          @click="confirmDelete"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
/**
 * 农场设置 - 地块智能出水桩管理弹窗
 * 对齐移动端 pages/home/activity/farm/device_list?dvType=50&landId=
 */
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { batchDeleteDevices, getDeviceList } from '@/api/device'
import { useFarmStore } from '@/store/farm'
import outletIcon from '@/assets/map/outlet-device-online.svg'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  landId: { type: [Number, String], default: null },
  /** 设备类型，出水桩固定 50 */
  dvType: { type: [Number, String], default: 50 }
})

const emit = defineEmits(['update:modelValue', 'deleted'])

const farmStore = useFarmStore()

const loading = ref(false)
const deleting = ref(false)
const searchText = ref('')
const deviceList = ref([])
const selectedRows = ref([])
const tableRef = ref(null)

const confirmVisible = ref(false)
const riskChecked = ref(false)
const pendingDeleteIds = ref([])

function onVisibleChange(v) {
  emit('update:modelValue', v)
}

function onSelectionChange(rows) {
  selectedRows.value = Array.isArray(rows) ? rows : []
}

async function fetchList() {
  const farmId = farmStore.selectFarm?.id
  if (farmId == null || props.landId == null) {
    deviceList.value = []
    return
  }
  loading.value = true
  try {
    const res = await getDeviceList({
      farmId,
      landId: props.landId,
      devType: props.dvType,
      searchText: searchText.value?.trim() || undefined
    })
    deviceList.value = Array.isArray(res?.data) ? res.data : []
    selectedRows.value = []
  } catch (e) {
    console.error('[FarmLandDeviceDialog] 获取设备列表失败', e)
    deviceList.value = []
  } finally {
    loading.value = false
  }
}

function openConfirm(ids) {
  if (!ids?.length) {
    ElMessage.warning('请选择要删除的项')
    return
  }
  pendingDeleteIds.value = ids.map((id) => id)
  riskChecked.value = false
  confirmVisible.value = true
}

function onDeleteOne(row) {
  if (row?.id == null) return
  openConfirm([row.id])
}

/** 有勾选则删除选中（对齐移动端底部删除）；无勾选则关闭弹窗 */
function onFooterPrimary() {
  const ids = selectedRows.value.map((r) => r.id).filter((id) => id != null)
  if (ids.length) {
    openConfirm(ids)
    return
  }
  onVisibleChange(false)
}

function onConfirmClosed() {
  riskChecked.value = false
  pendingDeleteIds.value = []
}

async function confirmDelete() {
  if (!riskChecked.value || !pendingDeleteIds.value.length) return
  deleting.value = true
  try {
    await batchDeleteDevices(
      { ids: pendingDeleteIds.value },
      { loading: false, silent: true }
    )
    ElMessage.success('操作成功')
    confirmVisible.value = false
    farmStore.farmChange()
    emit('deleted')
    await fetchList()
  } catch (e) {
    ElMessage.error(e?.message || '删除失败')
    console.error('[FarmLandDeviceDialog] 批量删除失败', e)
  } finally {
    deleting.value = false
  }
}

watch(
  () => [props.modelValue, props.landId],
  ([visible]) => {
    if (visible) {
      searchText.value = ''
      selectedRows.value = []
      fetchList()
    }
  }
)
</script>

<style scoped>
.farm-land-device-dialog__title {
  width: 100%;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: #111;
}

.farm-land-device-dialog__search {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.farm-land-device-dialog__search :deep(.el-input) {
  flex: 1;
}

.farm-land-device-dialog__table-wrap {
  min-height: 200px;
}

.farm-land-device-dialog__device {
  display: flex;
  align-items: center;
  gap: 10px;
}

.farm-land-device-dialog__device-img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  flex-shrink: 0;
}

.farm-land-device-dialog__device-name {
  font-size: 14px;
  font-weight: 600;
  color: #111;
}

.farm-land-device-dialog__trash {
  border: none;
  background: transparent;
  color: #909399;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.farm-land-device-dialog__trash:hover {
  color: #ef4444;
}

.farm-land-device-dialog__trash .iconfont {
  font-size: 18px;
}

.farm-land-device-dialog__empty {
  padding: 40px 0;
  color: #999;
}

.farm-land-device-dialog__confirm-desc {
  margin: 0 0 16px;
  font-size: 14px;
  color: #333;
  line-height: 1.6;
}
</style>
