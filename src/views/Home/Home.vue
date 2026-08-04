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
          <div class="notice-btn" title="消息通知">
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
                      <span>V1.2</span>
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
                    <a
                      class="user-menu-phone"
                      href="tel:18208187059"
                      @click.stop
                    >182-0818-7059</a>
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
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowDown,
  Expand,
  Fold
} from '@element-plus/icons-vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import PageTags from '@/components/PageTags.vue'
import FarmEmpty from '@/views/Map/FarmEmpty.vue'
import { menuList as staticMenuList } from '@/menuData.js'
import { useUserStore } from '@/store/user'
import { useFarmStore } from '@/store/farm'
import { logout } from '@/api/index'
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
/** 未读消息数；暂无消息接口，默认 0 不展示角标 */
const messageCount = ref(0)
const userMenuVisible = ref(false)
const farmPopoverVisible = ref(false)
const farmSearchText = ref('')

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

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const handleFarmSearch = async () => {
  try {
    await farmStore.fetchFarmList(farmSearchText.value)
  } catch (e) {
    console.error('搜索农场失败', e)
  }
}

const handleFarmSearchInput = () => {
  if (farmSearchText.value === '') {
    if (!farmStore.restoreFarmList()) {
      handleFarmSearch()
    }
  }
}

const clearFarmSearch = async () => {
  farmSearchText.value = ''
  if (!farmStore.restoreFarmList()) {
    await handleFarmSearch()
  }
}

const handleSelectFarm = (farm) => {
  if (!farm) return
  farmStore.setSelectFarm(farm)
  farmPopoverVisible.value = false
  farmSearchText.value = ''
  // 有搜索过滤时本地恢复全量列表，不重复请求 /api/farm/list
  farmStore.restoreFarmList()
}

const goEditFarm = () => {
  if (!farmStore.selectFarm?.id) {
    ElMessage.warning('请先选择农场')
    return
  }
  router.push('/farm/edit')
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

  if (command === 'service') {
    return
  }

  userMenuVisible.value = false
  ElMessage.info('功能开发中')
}

const syncActiveIndex = (path) => {
  // 设备子页（如控制页）保持左侧「设备」菜单高亮
  if (path.startsWith('/device')) {
    activeIndex.value = 'device'
    return
  }
  activeIndex.value = path.replace(/^\//, '') || 'map'
}

onMounted(async () => {
  syncActiveIndex(route.path)
  try {
    await farmStore.fetchFarmList()
  } catch (e) {
    console.error('获取农场列表失败', e)
  } finally {
    farmBootstrapDone.value = true
  }
})

watch(farmPopoverVisible, (visible) => {
  if (visible && !farmSearchText.value) {
    farmStore.restoreFarmList()
  }
})

watch(
  () => route.path,
  (path) => {
    syncActiveIndex(path)
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
  color: #666;
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

.user-menu-phone {
  color: #3d5a9a;
  text-decoration: underline;
  font-size: 13px;
  flex-shrink: 0;
}

.user-menu-phone:hover {
  color: #2f477c;
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
</style>
