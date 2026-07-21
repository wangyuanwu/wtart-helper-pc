<template>
  <div class="home">
    <div class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <div class="sidebar-logo-row">
          <img class="sidebar-logo-img" src="@/assets/logo.png" alt="水能手" />
          <div v-if="!farmStore.isFarmEmpty" class="sidebar-farm-info">
            <div class="farm-name-row">
              <span class="farm-name" :title="farmStore.selectFarm?.name">
                {{ farmStore.selectFarm?.name }}
              </span>
              <i class="iconfont icon-xiala farm-arrow"></i>
            </div>
            <div class="farm-setting-row">
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
        <div class="user">
          <el-dropdown @command="handleCommand">
            <div class="user-trigger">
              <div class="avatar">{{ avatarText }}</div>
              <span>{{ displayUserName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="pwd">修改密码</el-dropdown-item>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      <div v-if="showPageTags" class="page-tags-container">
        <PageTags />
      </div>
      <div class="content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowDown,
  Expand,
  Fold
} from '@element-plus/icons-vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import PageTags from '@/components/PageTags.vue'
import { menuList as staticMenuList } from '@/menuData.js'
import { useUserStore } from '@/store/user'
import { useFarmStore } from '@/store/farm'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const farmStore = useFarmStore()

const isCollapsed = ref(false)
const showPageTags = false
const showBreadcrumb = false
const activeIndex = ref('')
const menuList = ref(staticMenuList)

const displayUserName = computed(
  () =>
    userStore.userInfo?.nickname ||
    userStore.userInfo?.phoneNumber ||
    userStore.userInfo?.phone ||
    '管理员'
)
const avatarText = computed(() => displayUserName.value.slice(0, 1))

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
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

const handleCommand = (command) => {
  if (command === 'logout') {
    userStore.logOut()
    router.push('/login')
  } else if (command === 'profile') {
    router.push('/user/profile')
  } else if (command === 'pwd') {
    router.push('/user/pwd')
  }
}

const syncActiveIndex = (path) => {
  activeIndex.value = path.replace(/^\//, '') || 'map'
}

onMounted(() => {
  syncActiveIndex(route.path)
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
  width: 52px;
  height: 52px;
  border-radius: 10px;
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
  width: 38px;
  height: 38px;
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

.user-trigger {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary-color);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.content {
  flex: 1;
  overflow: auto;
  background: #f5f7fa;
}

/* ---- El-Menu 基础重置 ---- */
:deep(.el-menu) {
  background-color: transparent !important;
  border-right: none;
}

:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  height: 48px;
  line-height: 48px;
  border-radius: 10px;
  margin-bottom: 4px;
  padding: 0 10px !important;
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
  display: none;
}

/* 折叠时让 el-menu-item 居中显示图标 */
.sidebar.collapsed :deep(.el-menu-item),
.sidebar.collapsed :deep(.el-sub-menu__title) {
  padding: 0 !important;
  justify-content: center;
}
</style>
