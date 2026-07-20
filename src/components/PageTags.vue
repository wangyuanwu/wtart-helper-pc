<template>
  <div class="page-tags">
    <el-tag
      v-for="(tag, index) in pageTags"
      :key="tag.path"
      :closable="pageTags.length > 1"
      :effect="tag.path === currentPath ? 'dark' : 'plain'"
      @click="goToPage(tag.path)"
      @close="removeTag(index)"
      class="mr-2 cursor-pointer"
    >
      {{ tag.title }}
    </el-tag>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const pageTags = ref([])
const currentPath = computed(() => route.path)

const generateRouteTitleMap = () => {
  const map = { '/': '工作台' }
  router.getRoutes().forEach((item) => {
    item.children?.forEach((child) => {
      if (child.meta?.title) {
        const childPath = child.path ? `/${child.path}` : '/'
        map[childPath] = child.meta.title
      }
    })
  })
  return map
}

const routeTitleMap = generateRouteTitleMap()

const addPageTag = (path, title) => {
  if (!pageTags.value.some((tag) => tag.path === path)) {
    pageTags.value.push({ path, title })
  }
}

const goToPage = (path) => {
  router.push(path)
}

const removeTag = (index) => {
  const removed = pageTags.value[index]
  pageTags.value.splice(index, 1)
  if (removed.path === route.path && pageTags.value.length) {
    router.push(pageTags.value[pageTags.value.length - 1].path)
  }
}

watch(
  () => route.path,
  (newPath) => {
    const title = routeTitleMap[newPath] || route.meta?.title || '页面'
    addPageTag(newPath, title)
  },
  { immediate: true }
)
</script>

<style scoped>
.page-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 8px 12px;
}

.page-tags .el-tag {
  margin-right: 8px;
  margin-bottom: 8px;
  cursor: pointer;
}

.page-tags .el-tag.is-dark {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}

:deep(.el-tag--plain) {
  --el-tag-border-color: var(--primary-color) !important;
  color: var(--primary-color) !important;
}

:deep(.el-tag--dark.el-tag--primary) {
  --el-tag-bg-color: var(--primary-color) !important;
  --el-tag-border-color: var(--primary-color) !important;
  color: #fff !important;
}
</style>
