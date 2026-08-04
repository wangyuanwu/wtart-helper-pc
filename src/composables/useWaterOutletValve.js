import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { closeWaterDv, openWaterDv } from '@/api/device'

/**
 * 出水桩 A/B 口开关控制（对齐移动端 device.vue + WaterDvPopup）
 */
export function useWaterOutletValve() {
  const controlWaterOutletList = ref({})
  const isLockControl = ref(false)
  const closeOpenOrderCache = ref(null)
  const controlWaterOutletCache = ref(null)

  function findControlWaterOutlet(deviceLandList, waterId) {
    for (const land of deviceLandList || []) {
      for (const dev of land.devices || []) {
        const pile = dev.specificData?.waterOutletPile
        if (pile && String(pile.id) === String(waterId)) return pile
      }
    }
    return null
  }

  function controlWaterOutType0(controlWaterOutlet, portId, status) {
    const ports = controlWaterOutlet.ports
    if (!Array.isArray(ports) || ports.length < 2) return

    const portA = ports.find((p) => Number(p.outletNo) === 1) || ports[0]
    const portB = ports.find((p) => Number(p.outletNo) === 2) || ports[1]
    let controlPort = null
    let otherPort = null

    if (String(portA.id) === String(portId)) {
      controlPort = portA
      otherPort = portB
    } else if (String(portB.id) === String(portId)) {
      controlPort = portB
      otherPort = portA
    }
    if (!controlPort) return

    controlWaterOutletList.value[controlWaterOutlet.id] = controlWaterOutlet

    if (status) {
      controlPort.isOpen = true
      if (otherPort) otherPort.isOpen = false
      controlWaterOutlet.valveAction = Number(controlPort.outletNo) === 1 ? 1 : 3
      openWaterDvHttp(
        {
          force: false,
          waterOutletId: controlWaterOutlet.id,
          outPorts: [
            {
              outletNo: controlPort.outletNo,
              opening: controlPort.defaultOpening || 0
            }
          ]
        },
        controlWaterOutlet
      )
    } else {
      controlPort.isOpen = false
      controlWaterOutlet.valveAction = Number(controlPort.outletNo) === 1 ? 2 : 4
      closeWaterDvHttp(
        {
          force: false,
          waterOutletId: controlWaterOutlet.id,
          outPorts: [{ outletNo: controlPort.outletNo }]
        },
        controlWaterOutlet
      )
    }
  }

  async function openWaterDvHttp(order, controlWaterOutlet) {
    closeOpenOrderCache.value = order
    controlWaterOutletCache.value = controlWaterOutlet
    try {
      await openWaterDv(order, { loading: true, silent: true })
      ElMessage.success('操作成功')
    } catch (e) {
      if (e?.code === 40102) {
        try {
          await ElMessageBox.confirm(
            '系统监测到该地块下其它出水口处于关闭状态，仍打开当前出水口可能会出现爆管风险。是否强制打开？',
            '提示',
            {
              confirmButtonText: '强制打开',
              cancelButtonText: '取消',
              type: 'warning'
            }
          )
          const retryOrder = { ...closeOpenOrderCache.value, force: true }
          await openWaterDv(retryOrder, { loading: true, silent: true })
          ElMessage.success('操作成功')
        } catch (err) {
          if (err !== 'cancel' && err?.message !== 'cancel') {
            ElMessage.error(err?.message || '操作失败')
          }
          rollbackControl(controlWaterOutlet)
        }
      } else {
        rollbackControl(controlWaterOutlet)
        ElMessage.error(e?.message || '操作失败')
      }
    }
  }

  async function closeWaterDvHttp(order, controlWaterOutlet) {
    closeOpenOrderCache.value = order
    controlWaterOutletCache.value = controlWaterOutlet
    isLockControl.value = true
    try {
      await closeWaterDv(order, { loading: true, silent: true })
      ElMessage.success('操作成功')
    } catch (e) {
      if (e?.code === 40102) {
        try {
          await ElMessageBox.confirm(
            `${e?.message || '关闭失败'}，是否强制关闭？`,
            '提示',
            {
              confirmButtonText: '强制关闭',
              cancelButtonText: '取消',
              type: 'warning'
            }
          )
          const retryOrder = { ...closeOpenOrderCache.value, force: true }
          await closeWaterDv(retryOrder, { loading: true, silent: true })
          ElMessage.success('操作成功')
        } catch (err) {
          if (err !== 'cancel' && err?.message !== 'cancel') {
            ElMessage.error(err?.message || '操作失败')
          }
          rollbackControl(controlWaterOutlet)
        }
      } else {
        rollbackControl(controlWaterOutlet)
        ElMessage.error(e?.message || '操作失败')
      }
    } finally {
      isLockControl.value = false
    }
  }

  function rollbackControl(controlWaterOutlet) {
    if (controlWaterOutlet?.id != null) {
      delete controlWaterOutletList.value[controlWaterOutlet.id]
      controlWaterOutlet.valveAction = 0
    }
  }

  function handleSwitchChange(deviceLandList, waterId, portId, status) {
    const controlWaterOutlet = findControlWaterOutlet(deviceLandList, waterId)
    if (!controlWaterOutlet) {
      ElMessage.warning('设备数据异常，无法操作')
      return
    }
    handlePileSwitchChange(controlWaterOutlet, portId, status)
  }

  /** 单设备控制页：直接传入 waterOutletPile */
  function handlePileSwitchChange(pile, portId, status, options = {}) {
    if (!pile) {
      ElMessage.warning('设备数据异常，无法操作')
      return
    }

    const ds = options.ds != null ? options.ds : pile.ds
    if (Number(ds) === 9) {
      ElMessageBox.alert(
        '当前设备处于手动状态，无法远程操作，只能现场操作。',
        '提示',
        { confirmButtonText: '知道了' }
      )
      return
    }

    if (pile.outletType === 0) {
      controlWaterOutType0(pile, portId, status)
    }
  }

  function resetControlState() {
    controlWaterOutletList.value = {}
    isLockControl.value = false
    closeOpenOrderCache.value = null
    controlWaterOutletCache.value = null
  }

  return {
    controlWaterOutletList,
    isLockControl,
    handleSwitchChange,
    handlePileSwitchChange,
    resetControlState
  }
}
