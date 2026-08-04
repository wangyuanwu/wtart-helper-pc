<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="860px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    class="device-chart-dialog"
    @update:model-value="onVisibleChange"
    @opened="onOpened"
    @closed="onClosed"
  >
    <div v-loading="loading" class="device-chart-dialog__body">
      <div ref="chartRef" class="device-chart-dialog__chart"></div>
      <div class="device-chart-dialog__tabs">
        <button
          v-for="(tab, idx) in timeTabs"
          :key="tab"
          type="button"
          class="device-chart-dialog__tab"
          :class="{ 'is-active': activeIndex === idx }"
          @click="onTimeChange(idx)"
        >
          {{ tab }}
        </button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { getDeviceStatusHistory } from '@/api/device'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  deviceId: { type: [Number, String], default: null },
  /** BatteryPercent | SolarPanelVoltage | ChargingCurrent | MotorCurrent */
  fieldType: { type: String, default: 'SolarPanelVoltage' }
})

const emit = defineEmits(['update:modelValue'])

const timeTabs = ['近一月', '近3个月', '近6个月', '近1年', '全部']
const chartRef = ref(null)
const loading = ref(false)
const activeIndex = ref(0)
let chartInst = null

const FIELD_META = {
  BatteryPercent: {
    title: '电量统计',
    seriesName: '电量（%)',
    yMin: 0,
    yMax: 100
  },
  SolarPanelVoltage: {
    title: '太阳能板电压统计',
    seriesName: '太阳能板电压（V)',
    yMin: 0,
    yMax: 8
  },
  ChargingCurrent: {
    title: '充电电流统计',
    seriesName: '充电电流（mA)',
    yMin: null,
    yMax: 500
  },
  MotorCurrent: {
    title: '电机电流统计',
    seriesName: '电机电流（mA)',
    yMin: null,
    yMax: 2000
  }
}

const dialogTitle = computed(
  () => FIELD_META[props.fieldType]?.title || '设备数据统计'
)

function onVisibleChange(v) {
  emit('update:modelValue', v)
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatDateOnly(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatUtc(utc) {
  if (!utc) return ''
  const d = new Date(utc)
  if (Number.isNaN(d.getTime())) return String(utc)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function getStartEnd(index) {
  const now = new Date()
  const end = formatDateOnly(now)
  let start
  switch (index) {
    case 0: {
      const d = new Date(now)
      d.setMonth(now.getMonth() - 1)
      start = formatDateOnly(d)
      break
    }
    case 1: {
      const d = new Date(now)
      d.setMonth(now.getMonth() - 3)
      start = formatDateOnly(d)
      break
    }
    case 2: {
      const d = new Date(now)
      d.setMonth(now.getMonth() - 6)
      start = formatDateOnly(d)
      break
    }
    case 3: {
      const d = new Date(now)
      d.setFullYear(now.getFullYear() - 1)
      start = formatDateOnly(d)
      break
    }
    case 4:
    default:
      start = '2010-01-01'
      break
  }
  return { start, end }
}

function ensureChart() {
  if (!chartRef.value) return null
  if (!chartInst) {
    chartInst = echarts.init(chartRef.value)
  }
  return chartInst
}

function disposeChart() {
  if (chartInst) {
    chartInst.dispose()
    chartInst = null
  }
}

function buildOption(timeList, dataArray, dataMin) {
  const meta = FIELD_META[props.fieldType] || FIELD_META.SolarPanelVoltage
  const yMin = meta.yMin != null ? meta.yMin : dataMin || 0
  const yMax = meta.yMax

  return {
    grid: {
      top: '12%',
      left: '8%',
      right: '6%',
      bottom: '18%',
      containLabel: true
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        start: 0,
        end: 100,
        filterMode: 'none',
        height: 18,
        bottom: 8
      },
      {
        type: 'inside',
        xAxisIndex: [0],
        start: 0,
        end: 100,
        filterMode: 'none'
      }
    ],
    tooltip: {
      show: true,
      trigger: 'axis'
    },
    legend: {
      type: 'plain',
      show: true,
      right: 0,
      icon: 'circle',
      data: [meta.seriesName]
    },
    xAxis: [
      {
        type: 'category',
        boundaryGap: false,
        data: timeList,
        axisTick: { show: true },
        axisLine: { show: true }
      }
    ],
    yAxis: [
      {
        type: 'value',
        min: yMin,
        max: yMax,
        splitLine: { show: true }
      }
    ],
    series: [
      {
        animation: true,
        animationDuration: 500,
        name: meta.seriesName,
        type: 'line',
        connectNulls: true,
        itemStyle: { color: '#5f8cf4' },
        lineStyle: { color: '#5f8cf4', width: 2 },
        symbol: 'circle',
        symbolSize: 4,
        data: dataArray
      }
    ]
  }
}

function pickValue(item) {
  if (!item) return null
  const type = props.fieldType
  if (type === 'BatteryPercent') return item.BatteryPercent ?? item.batteryPercent
  if (type === 'SolarPanelVoltage')
    return item.SolarPanelVoltage ?? item.solarPanelVoltage
  if (type === 'ChargingCurrent')
    return item.ChargingCurrent ?? item.chargingCurrent
  if (type === 'MotorCurrent') return item.MotorCurrent ?? item.motorCurrent
  return null
}

function renderChart(list) {
  const chart = ensureChart()
  if (!chart) return

  const timeList = []
  const dataArray = []
  let min = 0

  ;(Array.isArray(list) ? list : []).forEach((item) => {
    const value = pickValue(item)
    if (value == null) return
    const n = Number(value)
    if (!Number.isFinite(n)) return
    if (min === 0 || n < min) min = n
    dataArray.push(n)
    timeList.push(formatUtc(item.MonitorTime ?? item.monitorTime))
  })

  chart.setOption(buildOption(timeList, dataArray, min), true)
  nextTick(() => chart.resize())
}

async function fetchHistory() {
  if (props.deviceId == null || !props.fieldType) return
  const { start, end } = getStartEnd(activeIndex.value)
  loading.value = true
  try {
    const res = await getDeviceStatusHistory(
      {
        DeviceId: props.deviceId,
        Fields: props.fieldType,
        StartTime: start,
        EndTime: end
      },
      { silent: true }
    )
    const data = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.data?.result)
        ? res.data.result
        : []
    renderChart(data)
  } catch (e) {
    console.error('[DeviceChartDialog] 获取历史数据失败', e)
    renderChart([])
  } finally {
    loading.value = false
  }
}

function onTimeChange(idx) {
  activeIndex.value = idx
  fetchHistory()
}

async function onOpened() {
  activeIndex.value = 0
  await nextTick()
  ensureChart()
  await fetchHistory()
  window.addEventListener('resize', handleResize)
}

function onClosed() {
  window.removeEventListener('resize', handleResize)
  disposeChart()
}

function handleResize() {
  chartInst?.resize()
}

watch(
  () => [props.fieldType, props.deviceId],
  () => {
    if (props.modelValue && chartInst) {
      activeIndex.value = 0
      fetchHistory()
    }
  }
)
</script>

<style scoped>
.device-chart-dialog__body {
  min-height: 420px;
}

.device-chart-dialog__chart {
  width: 100%;
  height: 360px;
}

.device-chart-dialog__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding-left: 4px;
}

.device-chart-dialog__tab {
  border: none;
  background: #fff;
  color: #909399;
  height: 32px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.device-chart-dialog__tab.is-active {
  background: #e8eef8;
  color: #3653a0;
}

.device-chart-dialog__tab:hover {
  color: #3653a0;
}
</style>
