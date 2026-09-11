<template>
  <div class="home">
    <div class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <div class="sidebar-logo-row">
          <img class="sidebar-logo-img" src="@/assets/logo.svg" alt="水能手" />
          <div v-if="!farmStore.isFarmEmpty" class="sidebar-farm-info">
            <div class="farm-name-row">
              <span class="farm-name" :title="farmStore.selectFarm?.name">
                {{ farmStore.selectFarm?.name }}
              </span>
              <el-popover
                v-model:visible="farmPopoverVisible"
                placement="bottom-start"
                :width="340"
                trigger="click"
                :show-arrow="false"
                :offset="10"
                popper-class="farm-select-popper"
              >
                <template #reference>
                  <i
                    class="iconfont icon-xiala farm-arrow"
                    :class="{ 'is-open': farmPopoverVisible }"
                  ></i>
                </template>
                <div class="farm-select-panel">
                  <div class="farm-select-search">
                    <i
                      class="iconfont icon-farm_ic_search farm-select-search-icon"
                      @click="handleFarmSearch"
                    ></i>
                    <input
                      v-model="farmSearchText"
                      class="farm-select-input"
                      type="text"
                      placeholder="输入农场名称/设备编号"
                      @keyup.enter="handleFarmSearch"
                      @input="handleFarmSearchInput"
                    />
                    <i
                      v-if="farmSearchText"
                      class="iconfont icon-shanchu farm-select-clear"
                      @click="clearFarmSearch"
                    ></i>
                  </div>
                  <div class="farm-select-list">
                    <div
                      v-for="item in farmStore.s_farm_list"
                      :key="item.id"
                      class="farm-select-item"
                      :class="{
                        active: item.id === farmStore.selectFarm?.id
                      }"
                      @click="handleSelectFarm(item)"
                    >
                      {{ item.name }}
                    </div>
                    <div
                      v-if="!farmStore.isFarmLoading && !farmStore.s_farm_list.length"
                      class="farm-select-empty"
                    >
                      暂无匹配农场
                    </div>
                  </div>
                </div>
              </el-popover>
            </div>
            <div class="farm-setting-row" @click="goEditFarm">
              <i class="iconfont icon-shezhi farm-setting-icon"></i>
              <span class="farm-setting-text">设置农场</span>
            </div>
          </div>
        </div>
      </div>
      <div class="sidebar-content">
        <el-menu
          :default-active="activeIndex"
          class="el-menu-vertical-demo"
          :collapse="isCollapsed"
          :unique-opened="true"
          @select="handleSelect"
        >
          <template v-for="menu in menuList" :key="menu.index">
            <el-sub-menu v-if="menu.children?.length" :index="menu.index">
              <template #title>
                <span class="sidebar-menu-icon-circle">
                  <i class="iconfont" :class="menu.icon"></i>
                </span>
                <span class="sidebar-menu-title">{{ menu.title }}</span>
              </template>
              <el-menu-item
                v-for="subMenu in menu.children"
                :key="subMenu.index"
                :index="subMenu.index"
              >
                {{ subMenu.title }}
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="menu.index">
              <span class="sidebar-menu-icon-circle">
                <i class="iconfont" :class="menu.icon"></i>
              </span>
              <span class="sidebar-menu-title">{{ menu.title }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </div>
    </div>

    <div class="main">
      <div class="header">
        <div class="header-left">
          <button class="collapse-btn" @click="toggleSidebar">
            <el-icon>
              <component :is="isCollapsed ? 'Expand' : 'Fold'" />
            </el-icon>
          </button>
          <Breadcrumb v-if="showBreadcrumb" />
        </div>
        <div class="header-right">
          <el-popover
            v-model:visible="quickCreateVisible"
            placement="bottom"
            :width="200"
            trigger="click"
            :offset="10"
            popper-class="quick-create-popper"
          >
            <template #reference>
              <button
                type="button"
                class="quick-create-btn"
                title="快捷创建"
                @click.stop
              >
                <el-icon class="quick-create-btn__icon"><Plus /></el-icon>
              </button>
            </template>
            <div class="quick-create-menu">
              <button
                v-for="item in quickCreateMenus"
                :key="item.key"
                type="button"
                class="quick-create-menu__item"
                @click="onQuickCreate(item.key)"
              >
                <el-icon
                  v-if="item.elIcon"
                  class="quick-create-menu__icon is-el"
                >
                  <component :is="item.elIcon" />
                </el-icon>
                <i
                  v-else
                  class="iconfont quick-create-menu__icon"
                  :class="item.icon"
                ></i>
                <span>{{ item.label }}</span>
              </button>
            </div>
          </el-popover>
          <div
            class="notice-btn"
            title="预警信息"
            @click="toAlarmList"
          >
            <i class="iconfont icon-a-lujingbiankuang notice-icon"></i>
            <span v-if="messageCount > 0" class="notice-badge">
              {{ messageCount > 99 ? '99+' : messageCount }}
            </span>
          </div>
          <div class="user-area">
            <img class="avatar" :src="avatarUrl" alt="用户头像" />
            <el-popover
              v-model:visible="userMenuVisible"
              placement="bottom-end"
              :width="300"
              trigger="hover"
              :show-arrow="false"
              :offset="8"
              popper-class="user-menu-popper"
            >
              <template #reference>
                <span
                  class="user-arrow-wrap"
                  @click.stop="userMenuVisible = !userMenuVisible"
                >
                  <el-icon class="user-arrow"><ArrowDown /></el-icon>
                </span>
              </template>
              <div class="user-menu">
                <div class="user-menu-header">
                  <img class="user-menu-avatar" :src="menuAvatarUrl" alt="用户头像" />
                  <div class="user-menu-info">
                    <div class="user-menu-name">{{ displayUserName }}</div>
                    <div class="user-menu-edit" @click="handleUserMenu('editNickname')">
                      <i class="iconfont icon-my_ic_eitd"></i>
                      <span>修改昵称</span>
                    </div>
                  </div>
                </div>
                <div class="user-menu-list">
                  <div class="user-menu-item" @click="handleUserMenu('language')">
                    <div class="user-menu-item-left">
                      <img class="user-menu-icon" :src="iconLang" alt="" />
                      <span>语言切换</span>
                    </div>
                    <div class="user-menu-item-right">
                      <span>中文</span>
                      <span class="user-menu-chevron">›</span>
                    </div>
                  </div>
                  <div class="user-menu-item" @click="handleUserMenu('about')">
                    <div class="user-menu-item-left">
                      <img class="user-menu-icon" :src="iconAbout" alt="" />
                      <span>关于软件</span>
                    </div>
                    <div class="user-menu-item-right">
                      <span class="user-menu-chevron">›</span>
                    </div>
                  </div>
                  <div class="user-menu-item" @click="handleUserMenu('changeAvatar')">
                    <div class="user-menu-item-left">
                      <img class="user-menu-icon" :src="iconAvatar" alt="" />
                      <span>更换头像</span>
                    </div>
                    <div class="user-menu-item-right">
                      <span class="user-menu-chevron">›</span>
                    </div>
                  </div>
                  <div class="user-menu-item" @click="handleUserMenu('service')">
                    <div class="user-menu-item-left">
                      <img class="user-menu-icon" :src="iconService" alt="" />
                      <span>联系客服</span>
                    </div>
                    <div class="user-menu-item-right">
                      <span class="user-menu-chevron">›</span>
                    </div>
                  </div>
                  <div class="user-menu-item user-menu-item--last" @click="handleUserMenu('logout')">
                    <div class="user-menu-item-left">
                      <img class="user-menu-icon" :src="iconLogout" alt="" />
                      <span>退出登录</span>
                    </div>
                  </div>
                </div>
              </div>
            </el-popover>
          </div>
        </div>
      </div>
      <!-- 更换头像：对齐移动端 chooseImage + uploadFile -->
      <input
        ref="avatarInputRef"
        type="file"
        accept="image/*"
        class="avatar-file-input"
        @change="onAvatarFileChange"
      />
      <ServicePhoneDialog v-model="servicePhoneVisible" />
      <AboutSoftwareDialog v-model="aboutSoftwareVisible" />
      <EditNicknameDialog
        ref="editNicknameDialogRef"
        v-model="editNicknameVisible"
        :nickname="currentNickname"
        @confirm="onEditNicknameConfirm"
      />
      <AlarmTipDialog
        v-model="alarmTipVisible"
        :alarm="currentTipAlarm"
        @confirm="onAlarmTipConfirm"
      />
      <LandEmptyDialog
        v-model="landEmptyVisible"
        @create="onCreateLandFromEmpty"
      />
      <div v-if="showPageTags" class="page-tags-container">
        <PageTags />
      </div>
      <div class="content">
        <div v-if="!farmBootstrapDone" class="content-state">加载中...</div>
        <FarmEmpty
          v-else-if="showShellFarmEmpty"
        />
        <router-view v-else />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowDown,
  Expand,
  Fold,
  Plus
} from '@element-plus/icons-vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import PageTags from '@/components/PageTags.vue'
import FarmEmpty from '@/views/Map/FarmEmpty.vue'
import LandEmptyDialog from '@/views/Map/LandEmptyDialog.vue'
import ServicePhoneDialog from '@/views/Home/ServicePhoneDialog.vue'
import AboutSoftwareDialog from '@/views/Home/AboutSoftwareDialog.vue'
import EditNicknameDialog from '@/views/Home/EditNicknameDialog.vue'
import AlarmTipDialog from '@/views/Home/AlarmTipDialog.vue'
import { menuList as staticMenuList } from '@/menuData.js'
import { useUserStore } from '@/store/user'
import { useFarmStore } from '@/store/farm'
import { useAlarmStore } from '@/store/alarm'
import { logout, uploadAvatar, updateNickName, getUser } from '@/api/index'
import { getAlarmList, handleAlarm } from '@/api/alarm'
import defaultAvatar from '@/assets/my_img_01.svg'
import iconLang from '@/assets/user/icon-lang.png'
import iconAbout from '@/assets/user/icon-about.png'
import iconAvatar from '@/assets/user/icon-avatar.png'
import iconService from '@/assets/user/icon-service.png'
import iconLogout from '@/assets/user/icon-logout.png'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const farmStore = useFarmStore()
const alarmStore = useAlarmStore()

const isCollapsed = ref(false)
const showPageTags = false
/** 首次农场列表请求完成前不展示空态，避免 isFarmEmpty 初始 true 闪屏 */
const farmBootstrapDone = ref(false)

/** 新建/选点农场流程页：无农场时也要渲染 router-view */
const isFarmCreateRoute = computed(
  () => !!route.meta?.farmCreate
)

const showShellFarmEmpty = computed(
  () =>
    !farmStore.isFarmLoading &&
    farmStore.isFarmEmpty &&
    !isFarmCreateRoute.value
)
const showBreadcrumb = false
const activeIndex = ref('')
const menuList = ref(staticMenuList)
/** 未处理告警数量（角标），对齐移动端 getAlarmingSize */
const messageCount = ref(0)
const alarmList = ref([])
const tipShowing = ref(false)
const alarmTipVisible = ref(false)
const currentTipAlarm = ref(null)
/** 当前弹窗队列用的告警列表（对齐移动端 alarmTips 入参） */
const tipAlarmQueue = ref([])
const userMenuVisible = ref(false)
const quickCreateVisible = ref(false)
const landEmptyVisible = ref(false)
const farmPopoverVisible = ref(false)
const farmSearchText = ref('')
const avatarInputRef = ref(null)
const servicePhoneVisible = ref(false)
const aboutSoftwareVisible = ref(false)
const editNicknameVisible = ref(false)
const editNicknameDialogRef = ref(null)

/** 对齐移动端 getAlarmListHttp：可叠加的延迟拉取定时器（不清空已有） */
const alarmFetchTimers = new Set()
let tipChainTimer = null

/** 对齐移动端首页 onShow：回前台延迟全量拉未处理告警 */
function onDocumentVisible() {
  if (document.visibilityState !== 'visible') return
  if (getFarmId() == null) return
  scheduleFetchAlarms()
}

const avatarUrl = computed(
  () => userStore.userInfo?.avatarUrl || defaultAvatar
)
const menuAvatarUrl = computed(
  () => userStore.userInfo?.avatarUrl || defaultAvatar
)
const displayUserName = computed(
  () =>
    userStore.userInfo?.nickname ||
    userStore.userInfo?.phoneNumber ||
    userStore.userInfo?.phone ||
    '农场主'
)
const currentNickname = computed(
  () => userStore.userInfo?.nickname || ''
)

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

/** 对齐移动端 farmListHttp：点击搜索 / 回车 / 清空输入时请求列表 */
const handleFarmSearch = async () => {
  try {
    await farmStore.fetchFarmList(farmSearchText.value)
  } catch (e) {
    console.error('搜索农场失败', e)
  }
}

/** 对齐移动端 inputBack：输入清空时重新拉全量列表 */
const handleFarmSearchInput = () => {
  if (farmSearchText.value === '') {
    handleFarmSearch()
  }
}

/** 清除搜索关键字并重新拉全量列表 */
const clearFarmSearch = () => {
  farmSearchText.value = ''
  handleFarmSearch()
}

/** 对齐移动端 clickFarm：切换农场、关闭面板、farmChange、刷新告警 */
const handleSelectFarm = (farm) => {
  if (!farm) return
  farmStore.setSelectFarm(farm)
  farmPopoverVisible.value = false
  scheduleFetchAlarms()
}

const goEditFarm = () => {
  if (!farmStore.selectFarm?.id) {
    ElMessage.warning('请先选择农场')
    return
  }
  router.push('/farm/edit')
}

const toAlarmList = () => {
  router.push('/alarm')
}

/** 快捷创建菜单（图标对齐地图图层 / 左侧菜单） */
const quickCreateMenus = [
  { key: 'farm', label: '新建农场', icon: 'icon-map_ic_farme' },
  { key: 'land', label: '新建地块', icon: 'icon-map_ic_land' },
  { key: 'device', label: '添加设备', elIcon: Plus },
  { key: 'group', label: '新建轮灌组', icon: 'icon-home_ic_foot_group_01' },
  {
    key: 'program',
    label: '新建轮灌程序',
    icon: 'icon-home_ic_foot_program'
  }
]

function closeQuickCreate() {
  quickCreateVisible.value = false
}

async function ensureFarmHasLands() {
  const farmId = getFarmId()
  if (farmId == null) {
    ElMessage.warning('请先选择农场')
    return false
  }
  let info = farmStore.s_farm_info
  if (!info || info.id !== farmId) {
    info = await farmStore.fetchFarmFullInfo(farmId)
  }
  const lands = info?.lands
  if (!Array.isArray(lands) || lands.length <= 0) {
    landEmptyVisible.value = true
    return false
  }
  return true
}

async function onQuickCreate(key) {
  closeQuickCreate()
  try {
    if (key === 'farm') {
      router.push({ path: '/map/chose-farm', query: { type: 'add' } })
      return
    }
    if (key === 'land') {
      if (getFarmId() == null) {
        ElMessage.warning('请先选择农场')
        return
      }
      router.push({ path: '/map/edit-plot', query: { type: 'add' } })
      return
    }
    if (key === 'device') {
      if (!(await ensureFarmHasLands())) return
      router.push('/device/add')
      return
    }
    if (key === 'group') {
      if (!(await ensureFarmHasLands())) return
      router.push({ path: '/map/edit-group', query: { from: 'home' } })
      return
    }
    if (key === 'program') {
      if (!(await ensureFarmHasLands())) return
      router.push({ path: '/irrigation-program/edit', query: { type: 'add' } })
    }
  } catch (e) {
    console.error('[Home] 快捷创建失败', e)
    ElMessage.error('操作失败，请稍后重试')
  }
}

const onCreateLandFromEmpty = () => {
  landEmptyVisible.value = false
  router.push({ path: '/map/edit-plot', query: { type: 'add' } })
}

function getFarmId() {
  return farmStore.selectFarm?.id ?? farmStore.s_selectFarm?.id ?? null
}

function getAlarmingSize(list) {
  return (list || []).filter((item) => item.status === 0).length
}

function clearAlarmFetchTimers() {
  alarmFetchTimers.forEach((id) => clearTimeout(id))
  alarmFetchTimers.clear()
}

function clearAlarmTimers() {
  clearAlarmFetchTimers()
  if (tipChainTimer) {
    clearTimeout(tipChainTimer)
    tipChainTimer = null
  }
}

function resetAlarmTipState() {
  clearAlarmTimers()
  tipShowing.value = false
  alarmTipVisible.value = false
  currentTipAlarm.value = null
  tipAlarmQueue.value = []
}

/**
 * 对齐移动端 getAlarmListHttp：
 * - 固定延迟 3000ms 后再请求
 * - 不清空已有定时器（可叠加），避免频繁触发时把等待反复重置
 */
function scheduleFetchAlarms() {
  const timerId = setTimeout(() => {
    alarmFetchTimers.delete(timerId)
    fetchHomeAlarms()
  }, 3000)
  alarmFetchTimers.add(timerId)
}

async function fetchHomeAlarms() {
  const farmId = getFarmId()
  if (farmId == null) {
    alarmList.value = []
    alarmStore.clearAlarmingArray()
    messageCount.value = 0
    return
  }
  try {
    const res = await getAlarmList(
      { FarmId: farmId, IsHandled: false },
      { silent: true }
    )
    const list = Array.isArray(res?.data?.result) ? res.data.result : []
    alarmList.value = list
    messageCount.value = getAlarmingSize(list)

    const nextArray = alarmStore.syncFromAlarmList(list)
    showAlarmTips(nextArray)
  } catch (e) {
    console.error('[Home] 获取预警列表失败', e)
  }
}

/** 对齐移动端 alarmTips：依次弹出未知道的告警（取最后一个 !isKnow） */
function showAlarmTips(list) {
  if (tipShowing.value) return
  const queue = list || []
  tipAlarmQueue.value = queue

  // 对齐移动端 forEach 覆盖：取最后一个未知道的告警
  let alarm
  queue.forEach((item) => {
    if (!item.isKnow) alarm = item
  })
  if (!alarm) return

  tipShowing.value = true
  currentTipAlarm.value = alarm
  alarmTipVisible.value = true
}

/**
 * 对齐移动端 a-tips-confirm success：
 * - handled=true → POST /handle 后继续队列
 * - handled=false → 仅 isKnow，立即继续队列
 */
async function onAlarmTipConfirm({ handled }) {
  const alarm = currentTipAlarm.value
  const queue = tipAlarmQueue.value || []
  if (!alarm) {
    tipShowing.value = false
    return
  }

  alarm.isKnow = true
  alarmStore.setAlarmKnow(alarm.id, true)
  alarmTipVisible.value = false
  currentTipAlarm.value = null

  if (handled) {
    await handleHomeAlarm(alarm, queue)
  } else {
    tipShowing.value = false
    showAlarmTips(queue)
  }
}

async function handleHomeAlarm(alarm, list) {
  try {
    await handleAlarm({ id: alarm.id }, { silent: true })
    ElMessage.success('操作成功')
  } catch (e) {
    console.error('[Home] 处理告警失败', e)
  } finally {
    tipShowing.value = false
    tipChainTimer = setTimeout(() => {
      showAlarmTips(list)
      // 处理后刷新角标（不连环弹窗）
      fetchHomeAlarmsSilent()
    }, 1000)
  }
}

/** 仅刷新角标，不再连环弹窗（避免与 tip 链打架） */
async function fetchHomeAlarmsSilent() {
  const farmId = getFarmId()
  if (farmId == null) {
    messageCount.value = 0
    alarmStore.clearAlarmingArray()
    return
  }
  try {
    const res = await getAlarmList(
      { FarmId: farmId, IsHandled: false },
      { silent: true }
    )
    const list = Array.isArray(res?.data?.result) ? res.data.result : []
    alarmList.value = list
    messageCount.value = getAlarmingSize(list)
    // 同步全局数组供设备列表/地图等打标，不连环弹窗
    alarmStore.syncFromAlarmList(list)
  } catch {
    /* ignore */
  }
}

const handleSelect = (key) => {
  const findMenuItem = (menus, index) => {
    for (const menu of menus) {
      if (menu.index === index) return menu
      if (menu.children?.length) {
        const found = findMenuItem(menu.children, index)
        if (found) return found
      }
    }
    return null
  }

  const menuItem = findMenuItem(menuList.value, key)
  if (menuItem?.path) {
    router.push(menuItem.path)
  } else {
    router.push(`/${key}`)
  }
}

const handleUserMenu = async (command) => {
  if (command === 'logout') {
    userMenuVisible.value = false
    try {
      await ElMessageBox.confirm('请确认是否退出登录？', '退出登录', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })

      const refreshTokenValue =
        userStore.refreshToken || localStorage.getItem('refreshToken') || ''

      await logout({ refreshToken: refreshTokenValue })
      userStore.logOut()
      ElMessage.success('已退出登录')
      router.push('/login')
    } catch {
      // 取消确认或接口失败
    }
    return
  }

  // 对齐移动端 my.vue → popPhone.openPoup
  if (command === 'service') {
    userMenuVisible.value = false
    servicePhoneVisible.value = true
    return
  }

  if (command === 'about') {
    userMenuVisible.value = false
    aboutSoftwareVisible.value = true
    return
  }

  // 对齐移动端 my.vue selectAvatar
  if (command === 'changeAvatar') {
    userMenuVisible.value = false
    selectAvatar()
    return
  }

  // 对齐移动端 my.vue changeNickName → my-edit-dialog
  if (command === 'editNickname') {
    userMenuVisible.value = false
    editNicknameVisible.value = true
    return
  }

  userMenuVisible.value = false
  ElMessage.info('功能开发中')
}

/** 对齐移动端 updateNickNameHttp：提交后提示并刷新用户信息 */
async function onEditNicknameConfirm(name) {
  try {
    const res = await updateNickName({ nickname: name })
    if (res?.code !== 200) {
      editNicknameDialogRef.value?.resetSubmitting?.()
      return
    }
    editNicknameVisible.value = false
    setTimeout(async () => {
      ElMessage.success('操作成功')
      try {
        const userRes = await getUser()
        userStore.setUserInfo(userRes.data || {})
      } catch (e) {
        userStore.setUserInfo({
          ...(userStore.userInfo || {}),
          nickname: name
        })
      }
    }, 500)
  } catch (e) {
    console.error('[Home] 修改昵称失败', e)
    editNicknameDialogRef.value?.resetSubmitting?.()
  }
}

/** 对齐移动端 chooseImage：选择本地图片后上传 */
function selectAvatar() {
  const input = avatarInputRef.value
  if (!input) return
  input.value = ''
  input.click()
}

async function onAvatarFileChange(e) {
  const file = e?.target?.files?.[0]
  if (!file) return
  if (!String(file.type || '').startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }
  try {
    const res = await uploadAvatar(file)
    const avatarUrlNext = res?.data
    if (!avatarUrlNext) {
      ElMessage.error('上传失败')
      return
    }
    userStore.setUserInfo({
      ...(userStore.userInfo || {}),
      avatarUrl: avatarUrlNext
    })
    ElMessage.success('上传成功')
  } catch (err) {
    console.error('[Home] 上传头像失败', err)
  } finally {
    if (avatarInputRef.value) avatarInputRef.value.value = ''
  }
}

const syncActiveIndex = (path) => {
  // 设备子页（如控制页）保持左侧「设备」菜单高亮
  if (path.startsWith('/device')) {
    activeIndex.value = 'device'
    return
  }
  if (path.startsWith('/alarm')) {
    activeIndex.value = ''
    return
  }
  activeIndex.value = path.replace(/^\//, '') || 'map'
}

onMounted(async () => {
  syncActiveIndex(route.path)
  try {
    await farmStore.fetchFarmList('', { isFirst: true })
  } catch (e) {
    console.error('获取农场列表失败', e)
  } finally {
    farmBootstrapDone.value = true
  }
  // 对齐移动端：农场列表首次就绪后 getAlarmListHttp（延迟 3s）
  scheduleFetchAlarms()
  // 对齐移动端 index onShow：浏览器标签回前台时再拉
  document.addEventListener('visibilitychange', onDocumentVisible)
  // 注意：不对齐监听 farmChange 拉告警。
  // 移动端 farmChange 只广播地图等业务；告警仅由 clickFarm / onShow / 首次列表显式触发。
  // 此前 PC 在每次 farmChange 时 reset 弹窗 + 防抖清零，会造成响应明显变慢。
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onDocumentVisible)
  resetAlarmTipState()
})

watch(
  () => route.path,
  (path, prev) => {
    syncActiveIndex(path)
    // 从预警页回到壳层其它页：延迟全量拉（对齐移动端 index onShow → getAlarmListHttp）
    if (prev?.startsWith('/alarm') && !path.startsWith('/alarm')) {
      scheduleFetchAlarms()
    }
  }
)
</script>

<style scoped>
.home {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 200px;
  background: #fff;
  color: #1a1a1a;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.06);
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  transition: width 0.3s ease;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-content {
  flex: 1;
  padding: 12px 10px;
  overflow-y: auto;
}

.sidebar-header {
  padding: 14px 14px 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.sidebar-logo-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.sidebar-logo-img {
  width: 54px;
  height: 54px;
  border-radius: 0;
  flex-shrink: 0;
  object-fit: contain;
}

.sidebar-farm-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.farm-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.farm-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  cursor: default;
}

.farm-arrow {
  font-size: 13px;
  color: #d8d8d8;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s;
}

.farm-arrow.is-open {
  transform: rotate(180deg);
}

.farm-setting-row {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.farm-setting-icon {
  font-size: 13px;
  color: #888;
}

.farm-setting-text {
  font-size: 12px;
  color: #888;
}

.farm-setting-row:hover .farm-setting-icon,
.farm-setting-row:hover .farm-setting-text {
  color: #555;
}

.sidebar.collapsed .sidebar-farm-info {
  display: none;
}

.sidebar.collapsed .sidebar-logo-img {
  width: 40px;
  height: 40px;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 200px;
  transition: margin-left 0.3s ease;
  width: calc(100% - 200px);
  min-width: 0;
}

.sidebar.collapsed + .main {
  margin-left: 60px;
  width: calc(100% - 60px);
}

.header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.collapse-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #333;
  padding: 5px;
  border-radius: 4px;
}

.collapse-btn:hover {
  background: #f5f5f5;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.quick-create-btn {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: #3653a0;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  box-sizing: border-box;
}

.quick-create-btn:hover {
  background: #2f4a90;
}

.quick-create-btn__icon {
  font-size: 16px;
  color: #fff;
  font-weight: 700;
}

.quick-create-btn__icon :deep(svg) {
  stroke: currentColor;
  stroke-width: 100;
  paint-order: stroke fill;
}

.notice-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  cursor: pointer;
  color: #8c8c8c;
}

.notice-btn:hover {
  color: #595959;
}

.notice-icon {
  font-size: 24px;
}

.notice-badge {
  position: absolute;
  top: -2px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #f56c6c;
  color: #fff;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
  box-sizing: border-box;
}

.user-area {
  display: flex;
  align-items: center;
  gap: 6px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid #3d5a9a;
  display: block;
  background: #fff;
}

.user-arrow-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  cursor: pointer;
  border-radius: 4px;
}

.user-arrow-wrap:hover {
  background: #f5f5f5;
}

.user-arrow {
  color: #8c8c8c;
  font-size: 14px;
}

.user-menu {
  padding: 4px 2px;
}

.user-menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 8px 16px;
}

.user-menu-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid #e8e8e8;
}

.user-menu-info {
  min-width: 0;
  flex: 1;
}

.user-menu-name {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu-edit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 13px;
  color: #8c8c8c;
  cursor: pointer;
}

.user-menu-edit .iconfont {
  font-size: 14px;
}

.user-menu-edit:hover {
  color: #595959;
}

.user-menu-list {
  border-top: 1px solid #f0f0f0;
}

.user-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  padding: 10px 8px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  color: #1a1a1a;
  font-size: 14px;
}

.user-menu-item--last {
  border-bottom: none;
}

.user-menu-item:hover {
  background: #f7f8fa;
  border-radius: 8px;
}

.user-menu-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.user-menu-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}

.user-menu-item-right {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #8c8c8c;
  font-size: 13px;
  flex-shrink: 0;
}

.user-menu-chevron {
  font-size: 18px;
  line-height: 1;
  color: #bfbfbf;
}

.avatar-file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.content {
  flex: 1;
  overflow: auto;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.content-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
  background: #fff;
}

.content :deep(.farm-empty),
.content > :deep(*) {
  flex: 1;
  min-height: 0;
}

/* ---- El-Menu 基础重置 ---- */
:deep(.el-menu) {
  background-color: transparent !important;
  border-right: none;
}

:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  height: 46px;
  line-height: 46px;
  border-radius: 23px;
  margin-bottom: 12px;
  padding: 0 14px !important;
  color: #4a4a4a !important;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.2s, color 0.2s;
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background: #f0f2f5 !important;
}

/* 选中态：蓝色圆角背景 + 白色文字 */
:deep(.el-menu-item.is-active) {
  background: #3d5a9a !important;
  color: #fff !important;
  border-left: none;
}

/* ---- 图标圆形容器 ---- */
:deep(.sidebar-menu-icon-circle) {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1.5px solid rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4a4a4a;
  flex-shrink: 0;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}

:deep(.sidebar-menu-icon-circle .iconfont) {
  font-size: 17px;
  line-height: 1;
  display: block;
}

/* 选中态：白色图标 + 蓝色圆圈背景 */
:deep(.el-menu-item.is-active) .sidebar-menu-icon-circle {
  border-color: rgba(255, 255, 255, 0.6);
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
}

/* 折叠时隐藏菜单文字 */
.sidebar.collapsed :deep(.sidebar-menu-title) {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  visibility: hidden !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* 折叠时覆盖 Element Plus 对 span 的隐藏规则，恢复图标并居中 */
.sidebar.collapsed .sidebar-content {
  padding-left: 0;
  padding-right: 0;
}

.sidebar.collapsed :deep(.el-menu--collapse) {
  width: 100%;
}

.sidebar.collapsed :deep(.el-menu-item),
.sidebar.collapsed :deep(.el-sub-menu__title) {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  padding: 0 !important;
  margin-left: 4px;
  margin-right: 4px;
}

.sidebar.collapsed :deep(.sidebar-menu-icon-circle) {
  width: 32px !important;
  height: 32px !important;
  overflow: visible !important;
  visibility: visible !important;
  display: flex !important;
  margin: 0 auto;
}

.farm-select-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.farm-select-search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  background: #f5f5f5;
}

.farm-select-search-icon {
  font-size: 16px;
  color: #8c8c8c;
  flex-shrink: 0;
  cursor: pointer;
}

.farm-select-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #1a1a1a;
}

.farm-select-input::placeholder {
  color: #b0b0b0;
}

.farm-select-clear {
  font-size: 14px;
  color: #b0b0b0;
  cursor: pointer;
  flex-shrink: 0;
}

.farm-select-clear:hover {
  color: #8c8c8c;
}

.farm-select-list {
  max-height: 320px;
  overflow-y: auto;
}

.farm-select-item {
  padding: 14px 4px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  line-height: 1.4;
  word-break: break-all;
}

.farm-select-item:last-child {
  border-bottom: none;
}

.farm-select-item:hover {
  color: #3d5a9a;
}

.farm-select-item.active {
  color: #2d8f47;
  font-weight: 600;
}

.farm-select-empty {
  padding: 28px 8px;
  text-align: center;
  color: #999;
  font-size: 13px;
}
</style>

<style>
.user-menu-popper.el-popover.el-popper {
  padding: 12px 10px;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
}

.farm-select-popper.el-popover.el-popper {
  padding: 14px 12px;
  border-radius: 14px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
}

.quick-create-popper.el-popover.el-popper {
  padding: 6px 0;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.quick-create-menu {
  display: flex;
  flex-direction: column;
}

.quick-create-menu__item {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  padding: 17px 16px;
  font-family: 'Source Han Sans', 'Source Han Sans SC', 'Noto Sans SC',
    'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 18px;
  font-weight: 350;
  font-feature-settings: 'kern' on;
  color: #646466;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
}

.quick-create-menu__item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 44px;
  right: 16px;
  bottom: 0;
  height: 1px;
  background: #f0f0f0;
}

.quick-create-menu__item:last-child {
  border-bottom: none;
}

.quick-create-menu__item:hover {
  background: #f7f8fa;
}

.quick-create-menu__icon {
  width: 18px;
  height: 18px;
  font-size: 16px;
  color: #646466;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
}

.quick-create-menu__icon.is-el {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #646466;
  color: #fff;
  font-size: 12px;
  box-sizing: border-box;
}

.quick-create-menu__icon.is-el svg {
  color: #fff;
  stroke: currentColor;
  stroke-width: 80;
  paint-order: stroke fill;
}
</style>
