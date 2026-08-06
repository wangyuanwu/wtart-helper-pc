<template>
  <div class="add-device-page">
    <header class="add-device-page__header">
      <h1 class="add-device-page__title">选择设备类型</h1>
      <p class="add-device-page__subtitle">
        请选择您想要添加到系统的硬件设备类型
      </p>
    </header>

    <div class="add-device-page__list">
      <button
        v-for="(item, index) in deviceTypes"
        :key="item.key"
        type="button"
        class="add-device-card"
        @click="toAdd(index)"
      >
        <div class="add-device-card__content">
          <div class="add-device-card__name">{{ item.name }}</div>
          <p class="add-device-card__desc">{{ item.desc }}</p>
          <span class="add-device-card__link">立即开始 →</span>
        </div>
        <img class="add-device-card__img" :src="item.image" alt="" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import imgOutlet from '@/assets/device/add/device_img_outl.png'
import imgIot from '@/assets/device/add/farm_img_fis.png'
import imgCamera from '@/assets/device/add/farm_img_Camera.png'

const router = useRouter()

/** 对齐移动端 add_device.vue deviceArray */
const deviceTypes = [
  {
    key: 'outlet',
    name: '添加智能出水桩',
    desc: '连接您的智能出水控制终端，实现精准灌溉与实时流量监控。',
    image: imgOutlet
  },
  {
    key: 'iot',
    name: '添加其他物联网设备',
    desc: '施肥机、气象站、传感器、控制器等农业自动化配套设备。',
    image: imgIot
  },
  {
    key: 'camera',
    name: '添加摄像头',
    desc: '远程视频监控，全天候守护您的农场资产，支持实时画面查看。',
    image: imgCamera
  }
]

/** 对齐移动端 toAdd：出水桩进编号页，其余研发中 */
function toAdd(index) {
  switch (index) {
    case 0:
      router.push('/device/add-number')
      break
    case 1:
    case 2:
      ElMessage.info('研发中')
      break
    default:
      break
  }
}
</script>

<style scoped>
.add-device-page {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #f7fafc;
  padding: 40px 48px 64px;
  box-sizing: border-box;
}

.add-device-page__header {
  text-align: center;
  margin-bottom: 36px;
}

.add-device-page__title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
}

.add-device-page__subtitle {
  margin: 12px 0 0;
  font-size: 14px;
  color: #909399;
  line-height: 1.5;
}

.add-device-page__list {
  width: min(860px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.add-device-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  width: 100%;
  min-height: 168px;
  padding: 28px 36px;
  border: 1px solid #ebeef5;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 6px 24px rgba(54, 83, 160, 0.06);
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.add-device-card:hover {
  border-color: rgba(54, 83, 160, 0.35);
  box-shadow: 0 10px 28px rgba(54, 83, 160, 0.1);
}

.add-device-card__content {
  flex: 1;
  min-width: 0;
}

.add-device-card__name {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  line-height: 1.4;
}

.add-device-card__desc {
  margin: 10px 0 0;
  max-width: 420px;
  font-size: 14px;
  color: #909399;
  line-height: 1.6;
}

.add-device-card__link {
  display: inline-block;
  margin-top: 18px;
  font-size: 14px;
  font-weight: 600;
  color: #3653a0;
}

.add-device-card__img {
  width: 148px;
  height: 148px;
  object-fit: contain;
  flex-shrink: 0;
}
</style>
