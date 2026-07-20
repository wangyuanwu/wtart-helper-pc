<template>
  <div class="home">
    <div class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="logo">
        <div class="logo-content">
          <div class="logo-icon">农</div>
          <h2>农业物联网管理平台</h2>
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
                <el-icon v-if="iconComponents[menu.icon]">
                  <component :is="iconComponents[menu.icon]" />
                </el-icon>
                <span>{{ menu.title }}</span>
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
              <el-icon v-if="iconComponents[menu.icon]">
                <component :is="iconComponents[menu.icon]" />
              </el-icon>
              <span>{{ menu.title }}</span>
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
          <Breadcrumb />
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
      <div class="page-tags-container">
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
  HomeFilled,
  Location,
  Monitor,
  Grid,
  Timer,
  ArrowDown,
  Expand,
  Fold
} from '@element-plus/icons-vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import PageTags from '@/components/PageTags.vue'
import { menuList as staticMenuList } from '@/menuData.js'
import { useUserStore } from '@/store/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isCollapsed = ref(false)
const activeIndex = ref('')
const menuList = ref(staticMenuList)

const iconComponents = {
  HomeFilled,
  Location,
  Monitor,
  Grid,
  Timer,
  Expand,
  Fold,
  ArrowDown
}

const displayUserName = computed(() => userStore.userInfo?.name || userStore.userInfo?.phone || '管理员')
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
  } else if (key === '') {
    router.push('/')
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
  if (path === '/') {
    activeIndex.value = ''
    return
  }
  activeIndex.value = path.replace(/^\//, '')
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
  width: 220px;
  background: linear-gradient(180deg, #f0f9f2 0%, #e8f5ea 100%);
  color: #1a1a1a;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.08);
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
  width: 64px;
}

.sidebar-content {
  flex: 1;
  padding: 12px 0;
  overflow-y: auto;
}

.logo {
  padding: 16px 20px 8px;
}

.logo-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--primary-color);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.logo h2 {
  font-size: 15px;
  margin: 0;
  line-height: 1.4;
  color: #1a1a1a;
}

.sidebar.collapsed .logo h2 {
  display: none;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 220px;
  transition: margin-left 0.3s ease;
  width: calc(100% - 220px);
  min-width: 0;
}

.sidebar.collapsed + .main {
  margin-left: 64px;
  width: calc(100% - 64px);
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

:deep(.el-menu) {
  background-color: transparent !important;
  border-right: none;
}

:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  color: #333 !important;
  font-weight: 600;
}

:deep(.el-menu-item.is-active) {
  color: var(--primary-color) !important;
  border-left: 3px solid var(--primary-color);
}
</style>
