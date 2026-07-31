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
          删除农场
        </button>
        <button
          type="button"
          class="edit-farm-page__btn is-primary"
          :disabled="saving || deleting || !farmInfo"
          @click="onSave"
        >
          <i class="iconfont icon-a-device_ic_edit1"></i>
          保存所有更改
        </button>
      </div>
    </div>

    <div v-if="loading" class="edit-farm-page__loading">加载中...</div>

    <template v-else-if="farmInfo">
      <!-- 农场信息 -->
      <section class="edit-farm-section">
        <h2 class="edit-farm-section__title">农场信息</h2>
        <div class="edit-farm-info-card">
          <div class="edit-farm-info-card__form">
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
              <div class="edit-farm-member-card__name-row">
                <span class="edit-farm-member-card__name">
                  {{ item.nickName || '暂无昵称' }}
                </span>
                <span class="edit-farm-member-card__role">
                  {{ getIdentityByRoleId(item.roleId) }}
                </span>
              </div>
              <div class="edit-farm-member-card__phone">
                {{ formatPhone(item.phoneNumber) }}
              </div>
            </div>
            <button
              v-if="currentUserId !== item.userId"
              type="button"
              class="edit-farm-member-card__edit"
              @click="onEditMember(item)"
            >
              <i class="iconfont icon-my_ic_eitd"></i>
            </button>
          </div>
          <button
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
              <h3 class="edit-farm-land-card__name">{{ item.name }}</h3>
              <div class="edit-farm-land-card__addr">
                <i class="iconfont icon-farm_ic_locate_02"></i>
                <span>{{ item.address || '暂无地址' }}</span>
              </div>
            </div>
            <div class="edit-farm-land-card__devices" @click.stop>
              <button
                type="button"
                class="edit-farm-device-btn"
                @click="onDeviceList(50, item.id)"
              >
                <i class="iconfont icon-home_ic_foot_outlet_01"></i>
                <span>智能出水桩</span>
              </button>
              <button
                type="button"
                class="edit-farm-device-btn"
                @click="onDeviceList(15, item.id)"
              >
                <i class="iconfont icon-map_ic_sfj"></i>
                <span>物联网设备</span>
              </button>
              <button
                type="button"
                class="edit-farm-device-btn"
                @click="onDeviceList(14, item.id)"
              >
                <i class="iconfont icon-map_ic_sxt"></i>
                <span>添加摄像头</span>
              </button>
            </div>
          </div>
          <div v-if="!landList.length" class="edit-farm-land-empty">
            暂无地块，点击「添加地块」创建
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteFarm,
  getFarmDetail,
  getMemberList,
  updateFarm
} from '@/api/farm'
import { getLandList } from '@/api/map'
import { useFarmStore } from '@/store/farm'
import { useUserStore } from '@/store/user'
import defaultAvatar from '@/assets/my_img_01.svg'

const router = useRouter()
const farmStore = useFarmStore()
const userStore = useUserStore()

const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const farmInfo = ref(null)
const memberList = ref([])
const landList = ref([])

const currentUserId = computed(
  () => userStore.userInfo?.id ?? userStore.userInfo?.userId
)

function getFarmId() {
  return farmStore.selectFarm?.id ?? null
}

function getIdentityByRoleId(roleId) {
  if (Number(roleId) === 10) return '农场主'
  return '农场成员'
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
    if (farmInfo.value) {
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
  router.push('/map/edit-plot?type=add')
}

function onLandDetail(land) {
  if (!land?.id) return
  ElMessage.info('地块编辑功能开发中')
}

function onDeviceList(type, landId) {
  if (Number(type) === 50) {
    router.push({ path: '/device', query: { landId: String(landId) } })
    return
  }
  ElMessage.info('功能开发中')
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

async function onDeleteFarm() {
  if (deleting.value || !farmInfo.value) return
  try {
    await ElMessageBox.confirm(
      '删除农场后数据无法恢复，是否继续？',
      '提示',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    deleting.value = true
    await deleteFarm(farmInfo.value.id)
    ElMessage.success('操作成功')
    await farmStore.fetchFarmList()
    setTimeout(() => router.replace('/map'), 800)
  } catch (e) {
    if (e !== 'cancel' && e?.message !== 'cancel') {
      console.error('[EditFarm] 删除农场失败', e)
    }
  } finally {
    deleting.value = false
  }
}

watch(
  () => farmStore.s_location,
  () => applyLocationFromStore(),
  { deep: true }
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
  gap: 6px;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.edit-farm-page__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.edit-farm-page__btn.is-primary {
  background: #1e3a8a;
  color: #fff;
}

.edit-farm-page__btn.is-primary-sm {
  background: #1e3a8a;
  color: #fff;
  padding: 8px 16px;
  font-size: 13px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
}

.edit-farm-page__btn.is-danger-outline {
  background: #fff;
  color: #ef4444;
  border: 1px solid #fecaca;
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
  display: flex;
  gap: 24px;
  background: #fff;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.edit-farm-info-card__form {
  flex: 1;
  min-width: 0;
}

.edit-farm-field {
  margin-bottom: 20px;
}

.edit-farm-field:last-child {
  margin-bottom: 0;
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
  background: #f5f6f8;
  border-radius: 10px;
  padding: 0 12px;
}

.edit-farm-field__input {
  flex: 1;
  border: none;
  background: transparent;
  height: 44px;
  font-size: 15px;
  color: #111;
  outline: none;
}

.edit-farm-field__clear {
  border: none;
  background: transparent;
  color: #999;
  cursor: pointer;
  padding: 4px;
}

.edit-farm-field__address {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  background: #f5f6f8;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
}

.edit-farm-field__address-text {
  flex: 1;
  font-size: 14px;
  color: #333;
  line-height: 1.4;
}

.edit-farm-field__address .iconfont {
  color: #2f6bff;
  font-size: 20px;
  flex-shrink: 0;
  margin-left: 8px;
}

.edit-farm-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
  width: 160px;
}

.edit-farm-stat {
  background: #eef4ff;
  border-radius: 12px;
  padding: 14px 16px;
  text-align: center;
}

.edit-farm-stat__label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.edit-farm-stat__value {
  font-size: 22px;
  font-weight: 700;
  color: #2f6bff;
  line-height: 1.2;
}

.edit-farm-stat__value small {
  font-size: 13px;
  font-weight: 500;
  margin-left: 2px;
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
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
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

.edit-farm-member-card__name-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.edit-farm-member-card__name {
  font-size: 15px;
  font-weight: 700;
  color: #111;
}

.edit-farm-member-card__role {
  font-size: 12px;
  color: #888;
}

.edit-farm-member-card__phone {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #2f6bff;
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
  min-height: 88px;
  background: #fff;
  border: 2px dashed #d0d5dd;
  border-radius: 12px;
  color: #2f6bff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
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
  background: #fff;
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: box-shadow 0.15s;
}

.edit-farm-land-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.edit-farm-land-card__name {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
  color: #111;
}

.edit-farm-land-card__addr {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

.edit-farm-land-card__addr .iconfont {
  color: #2f6bff;
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.edit-farm-land-card__devices {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.edit-farm-device-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: none;
  background: #f8fafc;
  border-radius: 10px;
  padding: 12px 8px;
  cursor: pointer;
  color: #444;
  font-size: 12px;
}

.edit-farm-device-btn .iconfont {
  font-size: 28px;
  color: #555;
}

.edit-farm-device-btn:hover {
  background: #eef4ff;
  color: #2f6bff;
}

.edit-farm-device-btn:hover .iconfont {
  color: #2f6bff;
}

.edit-farm-land-empty {
  padding: 40px;
  text-align: center;
  color: #999;
  background: #fff;
  border-radius: 12px;
}

@media (max-width: 900px) {
  .edit-farm-info-card {
    flex-direction: column;
  }

  .edit-farm-stats {
    width: 100%;
    flex-direction: row;
  }

  .edit-farm-stat {
    flex: 1;
  }

  .edit-farm-page__head {
    flex-direction: column;
  }
}
</style>
