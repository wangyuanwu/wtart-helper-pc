<template>
  <div class="breadcrumb">
    <el-breadcrumb separator="/">
      <el-breadcrumb-item :to="{ path: '/map' }">首页</el-breadcrumb-item>
      <template v-for="(item, index) in breadcrumbItems" :key="index">
        <el-breadcrumb-item v-if="item.path" :to="{ path: item.path }">
          {{ item.title }}
        </el-breadcrumb-item>
        <el-breadcrumb-item v-else>
          {{ item.title }}
        </el-breadcrumb-item>
      </template>
    </el-breadcrumb>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { menuList } from '../menuData.js'

const route = useRoute()

const breadcrumbItems = computed(() => {
  const path = route.path
  const items = []

  if (path === '/') return items

  const findBreadcrumb = (menus) => {
    for (const menu of menus) {
      if (menu.index === '') continue

      const menuPath = menu.path || (menu.index ? `/${menu.index}` : '/')

      if (path === menuPath || path.startsWith(`${menuPath}/`)) {
        items.push({ title: menu.title, path: menuPath })
        if (menu.children?.length) {
          findBreadcrumb(menu.children)
        }
        break
      }
    }
  }

  findBreadcrumb(menuList)

  if (!items.length && route.meta?.title) {
    items.push({ title: route.meta.title, path: '' })
  }

  return items
})
</script>

<style scoped>
.breadcrumb {
  font-size: 14px;
}
</style>
