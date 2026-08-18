import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 实时未处理告警（对齐移动端 vuex_alarmingArray）
 * - 由壳层 Home 拉取 getAlarmList 后写入
 * - 设备列表 / 控制页 / 组详情 / 地图弹窗按 deviceId + status===0 消费
 */
export const useAlarmStore = defineStore('alarm', () => {
  const alarmingArray = ref([])

  function clearAlarmingArray() {
    alarmingArray.value = []
  }

  /**
   * 用未处理告警列表刷新全局数组，保留本地 isKnow
   * @param {Array} list getAlarmList 返回的 result
   * @returns {Array} 刷新后的 alarmingArray
   */
  function syncFromAlarmList(list) {
    const next = []
    ;(list || []).forEach((item) => {
      if (item.status !== 0) return
      const cached = alarmingArray.value.find((x) => x.id === item.id)
      next.push({
        ...item,
        isKnow: cached?.isKnow === true
      })
    })
    alarmingArray.value = next
    return next
  }

  function setAlarmKnow(id, isKnow = true) {
    const bean = alarmingArray.value.find((x) => x.id === id)
    if (bean) bean.isKnow = isKnow
  }

  /** 对齐移动端 pageConfig.isDvAlarm */
  function isDvAlarm(deviceId) {
    if (deviceId == null) return false
    return alarmingArray.value.some(
      (item) =>
        String(item.deviceId) === String(deviceId) && Number(item.status) === 0
    )
  }

  /** 对齐移动端 pageConfig.isDvAlarmBean */
  function getDvAlarmBean(deviceId) {
    if (deviceId == null) return null
    return (
      alarmingArray.value.find(
        (item) =>
          String(item.deviceId) === String(deviceId) && Number(item.status) === 0
      ) || null
    )
  }

  return {
    alarmingArray,
    clearAlarmingArray,
    syncFromAlarmList,
    setAlarmKnow,
    isDvAlarm,
    getDvAlarmBean
  }
})
