<template>
  <aside class="chose-water-out-panel">
    <div class="chose-water-out-panel__head">
      <h2 class="chose-water-out-panel__title">{{ panelTitle }}</h2>
      <button type="button" class="chose-water-out-panel__close" @click="emit('close')">
        ×
      </button>
    </div>

    <div class="chose-water-out-panel__toolbar">
      <el-select
        v-model="landIndex"
        class="chose-water-out-panel__land"
        placeholder="选择地块"
        @change="onChangeLand"
      >
        <el-option
          v-for="(land, idx) in landSourceList"
          :key="land.id"
          :label="land.name"
          :value="idx"
        />
      </el-select>
      <div class="chose-water-out-panel__search">
        <input
          v-model="searchText"
          type="text"
          class="chose-water-out-panel__search-input"
          placeholder="搜索出水桩名称或ID..."
          @keyup.enter="handleSearch"
        />
        <button type="button" class="chose-water-out-panel__search-btn" @click="handleSearch">
          <i class="iconfont icon-farm_ic_search"></i>
        </button>
      </div>
    </div>

    <div class="chose-water-out-panel__tabs-row">
      <div class="chose-water-out-panel__tabs">
        <button
          v-for="(tab, idx) in tabLabels"
          :key="tab.key"
          type="button"
          class="chose-water-out-panel__tab"
          :class="{ 'is-active': choseIndex === idx }"
          @click="choseIndex = idx"
        >
          {{ tab.label }}
        </button>
      </div>
      <span class="chose-water-out-panel__selected-badge">已选 {{ checkCount }} 端口</span>
    </div>

    <div v-loading="loading" class="chose-water-out-panel__list">
      <div
        v-if="!filterDeviceList.length && !loading"
        class="chose-water-out-panel__empty"
      >
        暂无出水桩
      </div>
      <article
        v-for="item in filterDeviceList"
        :key="item.id"
        class="chose-water-out-panel__item"
      >
        <span
          v-if="getDeviceBindInfo(item).isBind"
          class="chose-water-out-panel__bind-tag"
        >
          {{ getDeviceBindInfo(item).isBindText }}
        </span>
        <img
          class="chose-water-out-panel__img"
          :src="deviceImg"
          alt=""
        />
        <div class="chose-water-out-panel__info">
          <div class="chose-water-out-panel__name">{{ item.name || '出水桩' }}</div>
          <div class="chose-water-out-panel__code">
            {{ item.deviceCode ? `ID:${item.deviceCode}` : '未绑定任何端口' }}
          </div>
        </div>
        <OutletPortSelector
          v-model="item.outletPorts"
          :outlet-type="item.outletType ?? 0"
          @port-change="onPortChange"
        />
      </article>
    </div>

    <div v-if="from === 'home'" class="chose-water-out-panel__footer">
      <button type="button" class="chose-water-out-panel__btn is-plain" @click="toAddDetail">
        保存（不圈地）
      </button>
      <button type="button" class="chose-water-out-panel__btn is-primary" @click="toNext">
        下一步（圈定轮灌区地块）
      </button>
    </div>
    <div v-else class="chose-water-out-panel__footer">
      <button type="button" class="chose-water-out-panel__btn is-primary is-full" @click="toUpdatePort">
        保存
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getLandList } from '@/api/map'
import { getWaterOutList } from '@/api/irrigationGroup'
import { useFarmStore } from '@/store/farm'
import OutletPortSelector from '@/components/OutletPortSelector.vue'
import deviceImg from '@/assets/device/add/device_img_outl.png'

const props = defineProps({
  from: { type: String, default: 'home' }
})

const emit = defineEmits(['change-land', 'close'])

const router = useRouter()
const farmStore = useFarmStore()

const loading = ref(false)
const searchText = ref('')
const searchTextCache = ref('')
const choseIndex = ref(0)
const landIndex = ref(0)
const landId = ref(null)
const landSourceList = ref([])
const deviceList = ref([])

const panelTitle = computed(() =>
  props.from === 'edit' ? '编辑轮灌组' : '新建轮灌组'
)

const totalCount = ref(0)
const checkCount = ref(0)
const unCheckCount = ref(0)

const tabLabels = computed(() => [
  { key: 'all', label: `全部(${totalCount.value})` },
  { key: 'unchecked', label: `未选(${unCheckCount.value})` },
  { key: 'checked', label: `已选(${checkCount.value})` }
])

const filterDeviceList = computed(() => {
  const key = searchTextCache.value.trim().toLowerCase()
  let temp = deviceList.value.filter((device) => {
    if (!key) return true
    const name = (device.name || '').toLowerCase()
    const code = (device.deviceCode || '').toLowerCase()
    return name.includes(key) || code.includes(key)
  })
  if (choseIndex.value === 1) {
    temp = temp.filter((device) =>
      (device.outletPorts || []).every((port) => !port.isCheck)
    )
  } else if (choseIndex.value === 2) {
    temp = temp.filter((device) =>
      (device.outletPorts || []).some((port) => port.isCheck)
    )
  }
  return temp
})

watch(choseIndex, () => {
  /* 筛选由 computed 处理 */
})

function getFarmId() {
  return (
    farmStore.s_selectFarm?.id ??
    farmStore.selectFarm?.id ??
    farmStore.s_farm_info?.id ??
    null
  )
}

function calcCount() {
  totalCount.value = deviceList.value.length
  let unCheckDeviceNum = 0
  let checkPortNum = 0
  deviceList.value.forEach((device) => {
    const ports = device.outletPorts || []
    const checkedPorts = ports.filter((p) => p.isCheck)
    checkPortNum += checkedPorts.length
    if (checkedPorts.length === 0) unCheckDeviceNum += 1
  })
  unCheckCount.value = unCheckDeviceNum
  checkCount.value = checkPortNum
}

function getDeviceBindInfo(device) {
  const outletPorts = device.outletPorts || []
  const nameArr = []
  outletPorts.forEach((port) => {
    const bindIds = port.bindGroupIds || []
    if (bindIds.length > 0) {
      const onlyCurrLand =
        bindIds.length === 1 && String(bindIds[0]) === String(landId.value)
      if (!onlyCurrLand) nameArr.push(port.outletName)
    }
  })
  if (!nameArr.length) return { isBind: false, isBindText: '' }
  return {
    isBind: true,
    isBindText: `${nameArr.join(',')}已绑定其他轮灌组`
  }
}

function emitLandChange() {
  emit('change-land', landId.value, deviceList.value)
}

function onPortChange() {
  calcCount()
  emitLandChange()
}

function handleSearch() {
  searchTextCache.value = searchText.value
}

function onChangeLand() {
  if (!landSourceList.value[landIndex.value]) return
  landId.value = landSourceList.value[landIndex.value].id
  fetchWaterOutList()
}

function getChosePortIds() {
  const outlets = farmStore.s_chose_port?.outlets || []
  return outlets.map((p) => p.outletId)
}

async function fetchLandList() {
  const farmId = getFarmId()
  if (farmId == null) return
  try {
    const res = await getLandList({ farmId })
    const lands = Array.isArray(res?.data) ? res.data : []
    landSourceList.value = lands
    landIndex.value = 0
    if (props.from === 'edit' && farmStore.s_chose_port?.landId != null) {
      const idx = lands.findIndex(
        (l) => String(l.id) === String(farmStore.s_chose_port.landId)
      )
      if (idx >= 0) landIndex.value = idx
    }
    if (lands.length > 0) {
      landId.value = lands[landIndex.value].id
      await fetchWaterOutList()
    }
  } catch (e) {
    console.error('[ChoseWaterOutPanel] 获取地块列表失败', e)
  }
}

async function fetchWaterOutList() {
  if (landId.value == null) return
  loading.value = true
  try {
    const res = await getWaterOutList({ landId: landId.value })
    const list = Array.isArray(res?.data) ? res.data : []
    const chosePortIds =
      props.from === 'edit' ? getChosePortIds().map((id) => String(id)) : []
    deviceList.value = list.map((item) => ({
      ...item,
      outletPorts: (item.outletPorts || []).map((port) => ({
        ...port,
        isCheck:
          props.from === 'home'
            ? false
            : chosePortIds.includes(String(port.id))
      }))
    }))
    calcCount()
    emitLandChange()
  } catch (e) {
    console.error('[ChoseWaterOutPanel] 获取出水桩列表失败', e)
    deviceList.value = []
    calcCount()
  } finally {
    loading.value = false
  }
}

function setPortData() {
  const outletsList = []
  deviceList.value.forEach((item) => {
    ;(item.outletPorts || []).forEach((port) => {
      if (port.isCheck) outletsList.push({ outletId: port.id })
    })
  })
  if (!outletsList.length) return null
  const params = {
    farmId: getFarmId(),
    landId: landId.value,
    name: '',
    area: null,
    areaJson: null,
    outlets: outletsList
  }
  if (props.from === 'home') {
    farmStore.setAddGroup(params)
  }
  if (props.from === 'edit') {
    farmStore.setPendingGroupChange({
      topic: 'changePort',
      data: params
    })
  }
  return params
}

function toAddDetail() {
  if (!setPortData()) {
    ElMessage.warning('请先选择出水口')
    return
  }
  router.push({ path: '/irrigation-group/edit', query: { type: 'add' } })
}

function toNext() {
  if (!setPortData()) {
    ElMessage.warning('请先选择出水口')
    return
  }
  farmStore.setLandIdGroup(landId.value)
  farmStore.setGroupDeviceList(deviceList.value)
  router.push({ path: '/map/edit-plot', query: { type: 'addGroup' } })
}

function toUpdatePort() {
  if (!setPortData()) {
    ElMessage.warning('请先选择出水口')
    return
  }
  router.back()
}

/** 对齐移动端 chose-water-out init */
async function init() {
  searchText.value = ''
  searchTextCache.value = ''
  choseIndex.value = 0
  await fetchLandList()
}

defineExpose({ init })
</script>

<style scoped>
.chose-water-out-panel {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 420px;
  height: 700px;
  max-width: calc(100% - 32px);
  max-height: calc(100% - 32px);
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(31, 45, 61, 0.16);
  z-index: 10;
  overflow: hidden;
}

.chose-water-out-panel__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #edf1f7;
}

.chose-water-out-panel__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.chose-water-out-panel__close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #909399;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.chose-water-out-panel__close:hover {
  background: #f5f7fa;
  color: #606266;
}

.chose-water-out-panel__toolbar {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px 0;
}

.chose-water-out-panel__land {
  width: 100%;
}

.chose-water-out-panel__search {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 4px 0 14px;
  border-radius: 20px;
  background: #f5f7fa;
}

.chose-water-out-panel__search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #303133;
  outline: none;
}

.chose-water-out-panel__search-input::placeholder {
  color: #c0c4cc;
}

.chose-water-out-panel__search-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #909399;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.chose-water-out-panel__tabs-row {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
}

.chose-water-out-panel__tabs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.chose-water-out-panel__tab {
  border: none;
  background: transparent;
  padding: 6px 10px;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.chose-water-out-panel__tab.is-active {
  color: #3653a0;
  border-bottom-color: #3653a0;
}

.chose-water-out-panel__selected-badge {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 12px;
  background: #e8f0fb;
  color: #3653a0;
  font-size: 12px;
  font-weight: 600;
}

.chose-water-out-panel__list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 16px;
  background: #f7fafc;
}

.chose-water-out-panel__empty {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.chose-water-out-panel__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid #edf1f7;
}

.chose-water-out-panel__bind-tag {
  position: absolute;
  top: 6px;
  right: 0;
  padding: 2px 8px;
  border-radius: 4px;
  background: #e8f5e9;
  color: #2e7d32;
  font-size: 11px;
  line-height: 1.4;
  max-width: 160px;
  text-align: right;
}

.chose-water-out-panel__img {
  width: 56px;
  height: 56px;
  object-fit: contain;
  flex-shrink: 0;
}

.chose-water-out-panel__info {
  flex: 1;
  min-width: 0;
}

.chose-water-out-panel__name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chose-water-out-panel__code {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}

.chose-water-out-panel__footer {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
  padding: 14px 16px 16px;
  border-top: 1px solid #edf1f7;
  background: #fff;
}

.chose-water-out-panel__btn {
  flex: 1;
  height: 44px;
  border-radius: 22px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #3653a0;
}

.chose-water-out-panel__btn.is-plain {
  background: #fff;
  color: #3653a0;
}

.chose-water-out-panel__btn.is-primary {
  background: #3653a0;
  color: #fff;
  border-color: #3653a0;
}

.chose-water-out-panel__btn.is-full {
  flex: none;
  width: 100%;
}

.chose-water-out-panel__btn:hover {
  opacity: 0.92;
}
</style>
