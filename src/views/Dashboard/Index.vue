<template>
  <div class="page-container">
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6" v-for="item in stats" :key="item.title">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-title">{{ item.title }}</div>
          <div class="stat-value">{{ item.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="quick-card">
      <template #header>
        <span>快捷入口</span>
      </template>
      <div class="quick-links">
        <el-button
          v-for="link in quickLinks"
          :key="link.path"
          type="success"
          plain
          @click="$router.push(link.path)"
        >
          {{ link.title }}
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
const stats = [
  { title: '设备总数', value: '--' },
  { title: '轮灌组', value: '--' },
  { title: '轮灌程序', value: '--' },
  { title: '在线设备', value: '--' }
]

const quickLinks = [
  { title: '地图', path: '/map' },
  { title: '设备管理', path: '/device' },
  { title: '轮灌组', path: '/irrigation-group' },
  { title: '轮灌程序', path: '/irrigation-program' }
]
</script>

<style scoped>
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
}

.stat-title {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
}

.quick-card {
  flex: 1;
}

.quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
