<template>
  <div class="edit-farm-page">
    <div class="edit-farm-page__head">
      <div>
        <h1 class="edit-farm-page__title">农场设置</h1>
        <p class="edit-farm-page__subtitle">
          管理农场成员权限、地块信息及关联设备配置
        </p>
      </div>
      <div class="edit-farm-page__head-actions">
        <button
          type="button"
          class="edit-farm-page__btn is-danger-outline"
          :disabled="saving || deleting"
          @click="onDeleteFarm"
        >
          <i class="iconfont icon-device_ic_delete"></i>
          删除
        </button>
        <button
          type="button"
          class="edit-farm-page__btn is-primary"
          :disabled="saving || deleting || !farmInfo"
          @click="onSave"
        >
          <el-icon class="edit-farm-page__btn-icon"><CircleCheck /></el-icon>
          保存
        </button>
      </div>
    </div>

    <div v-if="loading" class="edit-farm-page__loading">加载中...</div>

    <template v-else-if="farmInfo">
      <!-- 农场信息 -->
      <section class="edit-farm-section">
        <div class="edit-farm-info-card">
          <h2 class="edit-farm-info-card__title">农场信息</h2>
          <div class="edit-farm-info-card__body">
            <div class="edit-farm-info-card__form">
              <div class="edit-farm-field-row">
                <div class="edit-farm-field">
                  <label class="edit-farm-field__label">农场名称</label>
                  <div class="edit-farm-field__input-wrap">
                    <input
                      v-model="farmInfo.name"
                      class="edit-farm-field__input"
                      type="text"
                      placeholder="请输入农场名称"
                      maxlength="50"
                    />
                    <button
                      v-if="farmInfo.name"
                      type="button"
                      class="edit-farm-field__clear"
                      @click="farmInfo.name = ''"
                    >
                      <i class="iconfont icon-farm_ic_erase"></i>
                    </button>
                  </div>
                </div>
                <div class="edit-farm-field">
                  <label class="edit-farm-field__label">地理区域</label>
                  <button
                    type="button"
                    class="edit-farm-field__address"
                    @click="onEditAddress"
                  >
                    <span class="edit-farm-field__address-text">
                      {{ farmInfo.address || '请选择农场地址' }}
                    </span>
                    <i class="iconfont icon-farm_ic_locate_02"></i>
                  </button>
                </div>
              </div>
            </div>
            <div class="edit-farm-info-card__divider" aria-hidden="true"></div>
            <div class="edit-farm-stats">
              <div class="edit-farm-stat">
                <span class="edit-farm-stat__label">地块数量</span>
                <span class="edit-farm-stat__value">
                  {{ farmInfo.landCount ?? 0 }}
                  <small>个</small>
                </span>
              </div>
              <div class="edit-farm-stat">
                <span class="edit-farm-stat__label">总面积</span>
                <span class="edit-farm-stat__value">
                  {{ formatArea(farmInfo.area) }}
                  <small>亩</small>
                </span>
              </div>
              <div class="edit-farm-stat">
                <span class="edit-farm-stat__label">设备数量</span>
                <span class="edit-farm-stat__value">
                  {{ farmInfo.deviceCount ?? 0 }}
                  <small>个</small>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 农场成员 -->
      <section class="edit-farm-section">
        <div class="edit-farm-section__row">
          <h2 class="edit-farm-section__title">农场成员</h2>
        </div>
        <div class="edit-farm-member-grid">
          <div
            v-for="item in memberList"
            :key="item.id ?? item.userId"
            class="edit-farm-member-card"
          >
            <img
              class="edit-farm-member-card__avatar"
              :src="item.avatarUrl || defaultAvatar"
              alt=""
            />
            <div class="edit-farm-member-card__body">
              <div class="edit-farm-member-card__name">
                {{ item.nickName || '暂无昵称' }}
              </div>
              <div class="edit-farm-member-card__role">
                {{ getIdentityByRoleId(item.roleId) }}
              </div>
              <div class="edit-farm-member-card__phone">
                {{ formatPhone(item.phoneNumber) }}
              </div>
            </div>
            <button
              v-if="isFarmOwner"
              type="button"
              class="edit-farm-member-card__edit"
              @click="onEditMember(item)"
            >
              <i class="iconfont icon-my_ic_eitd"></i>
            </button>
          </div>
          <button
            v-if="isFarmOwner"
            type="button"
            class="edit-farm-member-add"
            @click="onAddMember"
          >
            <span class="edit-farm-member-add__icon">+</span>
            <span>快速添加</span>
          </button>
        </div>
      </section>

      <!-- 农场地块管理 -->
      <section class="edit-farm-section">
        <div class="edit-farm-section__row">
          <h2 class="edit-farm-section__title">农场地块管理</h2>
          <button
            v-if="isFarmOwner"
            type="button"
            class="edit-farm-page__btn is-primary-sm"
            @click="onAddLand"
          >
            添加地块
          </button>
        </div>
        <div class="edit-farm-land-list">
          <div
            v-for="item in landList"
            :key="item.id"
            class="edit-farm-land-card"
            @click="onLandDetail(item)"
          >
            <div class="edit-farm-land-card__main">
              <el-tooltip
                :content="item.name || ''"
                placement="top"
                :disabled="!item.name"
                :show-after="300"
              >
                <h3 class="edit-farm-land-card__name">{{ item.name }}</h3>
              </el-tooltip>
              <el-tooltip
                :content="item.address || '暂无地址'"
                placement="top"
                :show-after="300"
              >
                <div class="edit-farm-land-card__addr">
                  <i class="iconfont icon-farm_ic_locate_02"></i>
                  <span>{{ item.address || '暂无地址' }}</span>
                </div>
              </el-tooltip>
            </div>
            <div class="edit-farm-land-card__devices" @click.stop>
              <button
                type="button"
                class="edit-farm-device-btn"
                @click="onDeviceList(50, item.id)"
              >
                <img
                  class="edit-farm-device-btn__img"
                  :src="landDeviceOutletImg"
                  alt=""
                />
                <span>智能出水桩</span>
              </button>
              <button
                type="button"
                class="edit-farm-device-btn"
                @click="onDeviceList(15, item.id)"
              >
                <img
                  class="edit-farm-device-btn__img"
                  :src="landDeviceFisImg"
                  alt=""
                />
                <span>物联网设备</span>
              </button>
              <button
                type="button"
                class="edit-farm-device-btn"
                @click="onDeviceList(14, item.id)"
              >
                <img
                  class="edit-farm-device-btn__img"
                  :src="landDeviceCameraImg"
                  alt=""
                />
                <span>添加摄像头</span>
              </button>
            </div>
          </div>
          <div v-if="!landList.length" class="edit-farm-land-empty">
            暂无地块，点击「添加地块」创建
          </div>
        </div>
      </section>
      <FarmLandDeviceDialog
        v-model="deviceDialogVisible"
        :land-id="deviceDialogLandId"
        :dv-type="50"
        @deleted="onDeviceDeleted"
      />
    </template>

    <!-- 对齐移动端 a-tip-sure：删除农场需勾选风险确认 -->
    <el-dialog
      v-model="farmDeleteConfirmVisible"
      title="提示"
      width="420px"
      append-to-body
      :close-on-click-modal="false"
      @closed="onFarmDeleteConfirmClosed"
    >
      <p class="edit-farm-delete-desc">
        删除农场后数据无法恢复，是否继续？
      </p>
      <el-checkbox v-model="farmDeleteRiskChecked">
        已知晓风险，确认删除。
      </el-checkbox>
      <template #footer>
        <el-button @click="farmDeleteConfirmVisible = false">取消</el-button>
        <el-button
          type="danger"
          :disabled="!farmDeleteRiskChecked"
          :loading="deleting"
          @click="confirmDeleteFarm"
        >
          删除
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CircleCheck } from '@element-plus/icons-vue'
import {
  deleteFarm,
  getFarmDetail,
  getMemberList,
  updateFarm
} from '@/api/farm'
import { getLandList, getLandPlotById } from '@/api/map'
import { useFarmStore } from '@/store/farm'
import { useUserStore } from '@/store/user'
import defaultAvatar from '@/assets/my_img_01.svg'
import landDeviceOutletImg from '@/assets/map/outlet-device-online.svg'
import landDeviceFisImg from '@/assets/device/add/farm_img_fis.png'
import landDeviceCameraImg from '@/assets/device/add/farm_img_Camera.png'
import FarmLandDeviceDialog from './FarmLandDeviceDialog.vue'

const router = useRouter()
const farmStore = useFarmStore()
const userStore = useUserStore()

const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const farmInfo = ref(null)
const memberList = ref([])
const landList = ref([])
const deviceDialogVisible = ref(false)
const deviceDialogLandId = ref(null)
const farmDeleteConfirmVisible = ref(false)
const farmDeleteRiskChecked = ref(false)
/** 当前用户在本农场的角色，对齐移动端 myRoleId；10=农场主 */
const myRoleId = ref(0)

const currentUserId = computed(
  () => userStore.userInfo?.id ?? userStore.userInfo?.userId
)

/** 仅农场主可添加/编辑成员、添加地块（对齐移动端 myRoleId==10） */
const isFarmOwner = computed(() => Number(myRoleId.value) === 10)

function getFarmId() {
  return farmStore.selectFarm?.id ?? null
}

function getIdentityByRoleId(roleId) {
  switch (Number(roleId)) {
    case 10:
      return '农场主'
    case 11:
      return '超级成员'
    case 12:
      return '普通成员'
    default:
      return '农场成员'
  }
}

function formatArea(area) {
  if (area == null || area === '') return '0'
  const n = Number(area)
  if (!Number.isFinite(n)) return String(area)
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function formatPhone(phone) {
  if (!phone) return '--'
  const s = String(phone).replace(/\D/g, '')
  if (s.length === 11) {
    return `${s.slice(0, 3)}-${s.slice(3, 7)}-${s.slice(7)}`
  }
  return phone
}

async function loadFarmDetail() {
  const farmId = getFarmId()
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    router.replace('/map')
    return
  }
  try {
    const res = await getFarmDetail(farmId)
    farmInfo.value = res?.data ? { ...res.data } : null
    if (!farmInfo.value) return

    // 选点页 type=edit 返回：优先消费 pending 回填（对齐移动端 locationChange）
    // 避免重新挂载后用接口旧地址覆盖刚选的位置
    const pending = farmStore.consumePendingFarmLocation()
    if (pending) {
      farmInfo.value.address = pending.address
      farmInfo.value.longitude = pending.lng
      farmInfo.value.latitude = pending.lat
      farmStore.setLocation(pending)
    } else {
      farmStore.setLocation({
        lng: farmInfo.value.longitude,
        lat: farmInfo.value.latitude,
        address: farmInfo.value.address
      })
    }
  } catch (e) {
    console.error('[EditFarm] 获取农场详情失败', e)
    ElMessage.error('获取农场详情失败')
  }
}

async function loadMembers() {
  const farmId = getFarmId()
  if (farmId == null) return
  try {
    const res = await getMemberList({ farmId }, { silent: true })
    memberList.value = Array.isArray(res?.data) ? res.data : []
    // 对齐移动端：从成员列表解析当前用户 myRoleId
    myRoleId.value = 0
    const uid = currentUserId.value
    if (uid != null) {
      const me = memberList.value.find(
        (item) => String(item.userId) === String(uid)
      )
      if (me?.roleId != null) myRoleId.value = Number(me.roleId)
    }
  } catch (e) {
    console.error('[EditFarm] 获取成员列表失败', e)
  }
}

async function loadLands() {
  const farmId = getFarmId()
  if (farmId == null) return
  try {
    const res = await getLandList({ farmId })
    landList.value = Array.isArray(res?.data) ? res.data : []
    farmStore.setLandList(landList.value)
  } catch (e) {
    console.error('[EditFarm] 获取地块列表失败', e)
  }
}

async function loadAll() {
  loading.value = true
  await loadFarmDetail()
  await Promise.all([loadMembers(), loadLands()])
  loading.value = false
}

function applyLocationFromStore() {
  const loc = farmStore.s_location
  if (!loc || !farmInfo.value) return
  if (loc.address) farmInfo.value.address = loc.address
  if (loc.lng != null) farmInfo.value.longitude = loc.lng
  if (loc.lat != null) farmInfo.value.latitude = loc.lat
}

function onEditAddress() {
  router.push('/map/chose-farm?type=edit')
}

function onAddMember() {
  router.push('/farm/edit-member?type=add')
}

function onEditMember(item) {
  farmStore.setMemberInfo(item)
  router.push('/farm/edit-member?type=edit')
}

function onAddLand() {
  router.push({
    path: '/map/edit-plot',
    query: { type: 'add', from: 'farm-edit' }
  })
}

async function onLandDetail(land) {
  if (!land?.id) return
  try {
    // 对齐移动端 edit_farm getLandDetailHttp → vuex_land → add-edit-land?type=edit
    const res = await getLandPlotById(land.id)
    if (res?.data) {
      farmStore.setLand(res.data)
      router.push({
        path: '/farm/edit-land',
        query: { type: 'edit', from: 'farm-edit' }
      })
    }
  } catch (e) {
    console.error('[EditFarm] 获取地块详情失败', e)
    ElMessage.error('获取地块详情失败')
  }
}

function onDeviceList(type, landId) {
  if (Number(type) === 50) {
    // 对齐移动端 device_list?dvType=50&landId=，PC 用弹窗承载
    deviceDialogLandId.value = landId
    deviceDialogVisible.value = true
    return
  }
  ElMessage.info('功能开发中')
}

function onDeviceDeleted() {
  loadLands()
  loadFarmDetail()
}

async function onSave() {
  if (!farmInfo.value || saving.value) return
  const name = (farmInfo.value.name || '').trim()
  if (!name) {
    ElMessage.warning('请输入农场名称')
    return
  }
  saving.value = true
  try {
    await updateFarm({
      id: getFarmId(),
      name,
      address: farmInfo.value.address,
      longitude: farmInfo.value.longitude,
      latitude: farmInfo.value.latitude,
      coordinateType: farmInfo.value.coordinateType
    })
    ElMessage.success('操作成功')
    await farmStore.fetchFarmList()
    setTimeout(() => router.back(), 800)
  } catch (e) {
    console.error('[EditFarm] 保存农场失败', e)
  } finally {
    saving.value = false
  }
}

function onDeleteFarm() {
  if (deleting.value || !farmInfo.value) return
  farmDeleteRiskChecked.value = false
  farmDeleteConfirmVisible.value = true
}

function onFarmDeleteConfirmClosed() {
  farmDeleteRiskChecked.value = false
}

async function confirmDeleteFarm() {
  if (deleting.value || !farmInfo.value || !farmDeleteRiskChecked.value) return
  deleting.value = true
  try {
    await deleteFarm(farmInfo.value.id)
    ElMessage.success('操作成功')
    farmDeleteConfirmVisible.value = false
    await farmStore.fetchFarmList()
    setTimeout(() => router.replace('/map'), 800)
  } catch (e) {
    console.error('[EditFarm] 删除农场失败', e)
    ElMessage.error(e?.message || '删除农场失败')
  } finally {
    deleting.value = false
  }
}

watch(
  () => farmStore.s_location,
  () => applyLocationFromStore(),
  { deep: true }
)

/** 壳层切换当前农场时，同步刷新本页农场信息 / 成员 / 地块 */
watch(
  () => farmStore.selectFarm?.id,
  (id, prevId) => {
    if (id == null) {
      farmInfo.value = null
      memberList.value = []
      landList.value = []
      return
    }
    if (prevId != null && String(id) === String(prevId)) return
    // 首次挂载由 onMounted 加载；仅在切换农场时重载
    if (prevId == null) return
    loadAll()
  }
)

onMounted(loadAll)
onActivated(() => {
  applyLocationFromStore()
  loadMembers()
  loadLands()
})
</script>

<style scoped>
.edit-farm-page {
  min-height: 100%;
  padding: 24px 28px 40px;
  background: #f3f4f6;
  box-sizing: border-box;
}

.edit-farm-page__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.edit-farm-page__title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #111;
}

.edit-farm-page__subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  color: #888;
}

.edit-farm-page__head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.edit-farm-page__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  border-radius: 999px;
  padding: 10px 22px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  line-height: 1;
  box-sizing: border-box;
}

.edit-farm-page__btn .iconfont,
.edit-farm-page__btn-icon {
  font-size: 16px;
  line-height: 1;
}

.edit-farm-page__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.edit-farm-page__btn.is-primary {
  background: #1a3b87;
  color: #fff;
  box-shadow: 0 6px 14px rgba(26, 59, 135, 0.28);
}

.edit-farm-page__btn.is-primary-sm {
  background: #1a3b87;
  color: #fff;
  padding: 8px 20px;
  font-size: 13px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(26, 59, 135, 0.28);
}

.edit-farm-page__btn.is-danger-outline {
  background: #fff;
  color: #ef4444;
  border: 1px solid #f87171;
  box-shadow: none;
}

.edit-farm-page__loading {
  padding: 80px;
  text-align: center;
  color: #999;
}

.edit-farm-section {
  margin-bottom: 28px;
}

.edit-farm-section__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.edit-farm-section__title {
  margin: 0 0 14px;
  font-size: 18px;
  font-weight: 700;
  color: #111;
}

.edit-farm-section__row .edit-farm-section__title {
  margin-bottom: 0;
}

.edit-farm-info-card {
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 20px;
  padding: 20px 24px 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
}

.edit-farm-info-card__title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: #111;
}

/* 左表单 + 分割线 + 右统计：右侧三卡在 body 内占满剩余高度 */
.edit-farm-info-card__body {
  display: flex;
  align-items: stretch;
  gap: 0;
  min-height: 132px;
}

.edit-farm-info-card__form {
  flex: 1.35 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
}

.edit-farm-info-card__divider {
  flex: 0 0 1px;
  width: 1px;
  align-self: stretch;
  margin: 0 20px;
  background: #e5e7eb;
}

.edit-farm-field-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: nowrap;
  width: 100%;
}

.edit-farm-field {
  flex: 1 1 0;
  min-width: 0;
  box-sizing: border-box;
}

.edit-farm-field__label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #888;
}

.edit-farm-field__input-wrap {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0 12px;
  box-sizing: border-box;
  width: 100%;
}

.edit-farm-field__input {
  flex: 1;
  border: none;
  background: transparent;
  height: 40px;
  font-size: 14px;
  color: #111;
  outline: none;
  min-width: 0;
}

.edit-farm-field__clear {
  border: none;
  background: transparent;
  color: #999;
  cursor: pointer;
  padding: 4px;
  flex-shrink: 0;
}

.edit-farm-field__address {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 40px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
}

.edit-farm-field__address-text {
  flex: 1;
  font-size: 14px;
  color: #333;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-farm-field__address .iconfont {
  color: #9ca3af;
  font-size: 18px;
  flex-shrink: 0;
  margin-left: 8px;
}

.edit-farm-stats {
  display: flex;
  flex-direction: row;
  gap: 12px;
  flex: 1 1 0;
  min-width: 0;
  align-items: stretch;
  align-self: stretch;
  box-sizing: border-box;
}

.edit-farm-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  flex: 1 1 0;
  min-width: 0;
  min-height: 100%;
  background: #f8fafc;
  border-radius: 16px;
  padding: 16px 18px;
  text-align: left;
  box-sizing: border-box;
}

.edit-farm-stat__label {
  display: block;
  font-size: 13px;
  color: #6b7280;
  white-space: nowrap;
}

.edit-farm-stat__value {
  font-size: 28px;
  font-weight: 700;
  color: #1a3b87;
  line-height: 1.15;
}

.edit-farm-stat__value small {
  font-size: 13px;
  font-weight: 500;
  margin-left: 4px;
  color: #9ca3af;
}

.edit-farm-member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.edit-farm-member-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 12px;
  /* 原上下 padding 16px，各增 10px 使卡片高度 +20px */
  padding: 26px 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
}

.edit-farm-member-card__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  background: #f0f0f0;
  flex-shrink: 0;
}

.edit-farm-member-card__body {
  flex: 1;
  min-width: 0;
}

.edit-farm-member-card__name {
  font-size: 15px;
  font-weight: 700;
  color: #111;
  line-height: 1.3;
}

.edit-farm-member-card__role {
  margin-top: 2px;
  font-size: 12px;
  color: #888;
  line-height: 1.3;
}

.edit-farm-member-card__phone {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #2f6bff;
  line-height: 1.3;
}

.edit-farm-member-card__edit {
  border: none;
  background: #f5f6f8;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: #666;
  cursor: pointer;
  flex-shrink: 0;
}

.edit-farm-member-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  /* 与成员卡片同增高 20px，保持网格对齐 */
  min-height: 108px;
  background: #fff;
  border: 2px dashed #d0d5dd;
  border-radius: 12px;
  color: #2f6bff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-sizing: border-box;
}

.edit-farm-member-add__icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #eef4ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  line-height: 1;
}

.edit-farm-land-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-farm-land-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  background: #fff;
  border-radius: 12px;
  padding: 20px 28px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: box-shadow 0.15s;
}

.edit-farm-land-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.edit-farm-land-card__main {
  flex: 0 0 360px;
  width: 360px;
  min-width: 360px;
  max-width: 360px;
  overflow: hidden;
}

.edit-farm-land-card__main :deep(.el-tooltip__trigger) {
  display: block;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.edit-farm-land-card__name {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
  color: #3653a0;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.edit-farm-land-card__addr {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  font-size: 13px;
  color: #8a8f99;
  line-height: 1.4;
}

.edit-farm-land-card__addr .iconfont {
  color: #8a8f99;
  font-size: 14px;
  flex-shrink: 0;
}

.edit-farm-land-card__addr span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-farm-land-card__devices {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 16px;
  min-width: 0;
}

.edit-farm-device-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  padding: 4px 8px;
  cursor: pointer;
  color: #333;
  font-size: 14px;
  line-height: 1.2;
  white-space: nowrap;
  border-radius: 8px;
  transition: background 0.15s, color 0.15s;
}

.edit-farm-device-btn__img {
  width: 44px;
  height: 44px;
  object-fit: contain;
  flex-shrink: 0;
  display: block;
}

.edit-farm-device-btn:hover {
  background: #f5f8ff;
  color: #2f6bff;
}

.edit-farm-land-empty {
  padding: 40px;
  text-align: center;
  color: #999;
  background: #fff;
  border-radius: 12px;
}

.edit-farm-delete-desc {
  margin: 0 0 16px;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .edit-farm-info-card__body {
    flex-direction: column;
    min-height: 0;
  }

  .edit-farm-info-card__divider {
    width: 100%;
    height: 1px;
    margin: 16px 0;
  }

  .edit-farm-field-row {
    flex-direction: column;
  }

  .edit-farm-field {
    flex: 1 1 auto;
    width: 100%;
    max-width: none;
  }

  .edit-farm-stats {
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    max-width: none;
    min-height: 112px;
  }

  .edit-farm-stat {
    flex: 1;
    min-width: 0;
  }

  .edit-farm-page__head {
    flex-direction: column;
  }
}
</style>
