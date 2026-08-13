<template>
  <el-dialog
    v-model="visible"
    width="600px"
    align-center
    :show-close="true"
    :append-to-body="true"
    title="关于软件"
    class="about-software-dialog"
    modal-class="about-software-dialog-modal"
  >
    <div class="about-software">
      <div class="about-software__brand">
        <img class="about-software__logo" src="@/assets/logo.svg" alt="水能手" />
        <div class="about-software__name">水能手</div>
        <div class="about-software__slogan">面向农业的智慧灌溉物联网平台</div>
      </div>

      <div class="about-software__section">
        <h4 class="about-software__section-title">产品简介</h4>
        <p class="about-software__text">
          水能手面向农田灌溉场景，提供农场管理、地图可视化、出水桩远程控制、轮灌组与轮灌程序编排、以及预警告警等能力，帮助农户与农技人员更高效地完成日常灌溉作业。
        </p>
      </div>

      <div class="about-software__section">
        <h4 class="about-software__section-title">智慧灌溉与物联网</h4>
        <p class="about-software__text">
          在水资源约束趋紧、农业劳动力结构变化的背景下，传统粗放灌溉正加速向数字化、精准化转型。智慧灌溉依托田间传感、远程控制阀门、低功耗物联网连接与云边协同平台，将「感知—决策—执行」贯通起来，推动灌溉从经验浇水走向按需供水。
        </p>
        <p class="about-software__text">
          行业趋势显示，智能灌溉正从单一硬件走向「设备 + 数据服务」：通过出水桩状态监测、定时与轮灌程序、组控联动和异常预警，减少跑冒滴漏与无效浇灌，提升用水效率与田间管理精细度，服务大田、设施农业和经济作物等多元场景。
        </p>
      </div>

      <div class="about-software__section">
        <h4 class="about-software__section-title">我们的愿景</h4>
        <p class="about-software__text">
          我们希望以物联网与数字化手段，助力农业现代化与节水增效，让灌溉更省心、更可控、更可持续；在保障稳产增产的同时，为水资源节约、田间减负与绿色农业发展贡献力量，与种植者共同迈向智慧农业的新阶段。
        </p>
      </div>

      <div class="about-software__version">版本号：{{ versionText }}</div>
    </div>
  </el-dialog>
</template>

<script setup>
/**
 * 关于软件弹窗：产品简介 + 智慧灌溉愿景 + 版本号
 */
import { computed } from 'vue'
import pkg from '../../../package.json'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const versionText = computed(() => {
  const v = pkg?.version || '1.0.0'
  return v.startsWith('v') || v.startsWith('V') ? v : `V${v}`
})
</script>

<style scoped>
.about-software {
  padding: 4px 4px 8px;
}

.about-software__brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 0 16px;
  border-bottom: 1px solid #edf1f7;
}

.about-software__logo {
  width: 56px;
  height: 56px;
  object-fit: contain;
}

.about-software__name {
  margin-top: 10px;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.about-software__slogan {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}

.about-software__section {
  padding: 14px 0 0;
}

.about-software__section-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
  color: #303133;
}

.about-software__text {
  margin: 0 0 8px;
  font-size: 13px;
  color: #606266;
  line-height: 1.75;
  text-align: justify;
}

.about-software__version {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #edf1f7;
  text-align: center;
  font-size: 13px;
  color: #909399;
}
</style>

<style>
.about-software-dialog.el-dialog {
  border-radius: 12px;
  overflow: hidden;
}

.about-software-dialog .el-dialog__header {
  margin: 0;
  padding: 16px 20px 8px;
}

.about-software-dialog .el-dialog__title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.about-software-dialog .el-dialog__body {
  padding: 0 20px 16px;
}
</style>
