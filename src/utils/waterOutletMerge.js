/**
 * 出水桩列表轮询 merge / 端口开度状态（对齐移动端 device.vue mergeData）
 */

export function isPortOpen(port) {
  if (!port) return false
  if (port.isOpen != null) return !!port.isOpen
  return Number(port.currentOpening || 0) > 0
}

export function setPortsOpenStatus(waterOutletPile) {
  if (!waterOutletPile?.ports) return
  waterOutletPile.ports.forEach((port) => {
    port.isOpen = Number(port.currentOpening || 0) > 0
  })
}

export function getReplace0(oldWaterOut, waterOut) {
  if (!Array.isArray(waterOut?.ports) || waterOut.ports.length < 2) return false
  const portA = waterOut.ports.find((p) => Number(p.outletNo) === 1) || waterOut.ports[0]
  const portB = waterOut.ports.find((p) => Number(p.outletNo) === 2) || waterOut.ports[1]
  const action = oldWaterOut.valveAction

  if (action === 1) {
    return (
      Math.round(portA?.currentOpening || 0) >=
      Math.round(portA?.defaultOpening || 0)
    )
  }
  if (action === 3) {
    return (
      Math.round(portB?.currentOpening || 0) >=
      Math.round(portB?.defaultOpening || 0)
    )
  }
  if (action === 2) {
    return Math.round(portA?.currentOpening || 0) <= 0
  }
  if (action === 4) {
    return Math.round(portB?.currentOpening || 0) <= 0
  }
  if (action === 99) return true
  return false
}

function syncPortOpeningPressure(oldDev, newWaterOut) {
  const oldPorts = oldDev.specificData?.waterOutletPile?.ports
  if (!Array.isArray(newWaterOut?.ports) || !Array.isArray(oldPorts)) return
  newWaterOut.ports.forEach((newPort) => {
    const oldPort = oldPorts.find((op) => op.outletNo === newPort.outletNo)
    if (oldPort) {
      oldPort.currentOpening = newPort.currentOpening
      oldPort.pressure = newPort.pressure
    }
  })
  const pile = oldDev.specificData?.waterOutletPile
  if (pile) {
    pile.valveAction = newWaterOut.valveAction
    if (newWaterOut.flow != null) pile.flow = newWaterOut.flow
  }
}

/**
 * 合并单个设备的水桩数据（保留阀门操作中的本地状态）
 */
export function mergeDeviceWaterOutlet(oldDev, newDev, controlWaterOutletList) {
  const { specificData: newSpecificData, ...baseFields } = newDev
  Object.assign(oldDev, baseFields)

  if (!oldDev.specificData) oldDev.specificData = {}

  const newWaterOut = newSpecificData?.waterOutletPile
  if (!newWaterOut) {
    oldDev.specificData.waterOutletPile = null
    return
  }

  const cached = controlWaterOutletList[newWaterOut.id]
  if (cached) {
    if (cached.valveAction !== 0 && newWaterOut.valveAction === 0) {
      let isReplace = false
      if (newWaterOut.outletType === 0) {
        isReplace = getReplace0(cached, newWaterOut)
      }
      if (isReplace) {
        oldDev.specificData.waterOutletPile = newWaterOut
        setPortsOpenStatus(oldDev.specificData.waterOutletPile)
        delete controlWaterOutletList[newWaterOut.id]
      } else {
        syncPortOpeningPressure(oldDev, newWaterOut)
      }
    } else {
      syncPortOpeningPressure(oldDev, newWaterOut)
    }
  } else {
    oldDev.specificData.waterOutletPile = newWaterOut
    setPortsOpenStatus(oldDev.specificData.waterOutletPile)
  }
}

/** 轮询后按缓存恢复/补全端口 isOpen */
export function setOpenStatusOnList(deviceLandList, controlWaterOutletList) {
  if (!Array.isArray(deviceLandList)) return
  deviceLandList.forEach((land) => {
    ;(land.devices || []).forEach((dev) => {
      const waterOut = dev.specificData?.waterOutletPile
      if (!waterOut) return
      if (!controlWaterOutletList[waterOut.id]) {
        setPortsOpenStatus(waterOut)
      }
    })
  })
}

/**
 * 按地块分组的设备列表 merge（对齐移动端 mergeData）
 */
export function mergeDeviceLandList(oldList, newList, controlWaterOutletList) {
  if (!Array.isArray(oldList) || !Array.isArray(newList)) return newList

  oldList.forEach((oldLand) => {
    const newLand = newList.find(
      (nl) => String(nl.landId) === String(oldLand.landId)
    )
    if (!newLand) return

    oldLand.devices.forEach((oldDev) => {
      const newDev = (newLand.devices || []).find(
        (nd) => String(nd.id) === String(oldDev.id)
      )
      if (!newDev) return
      mergeDeviceWaterOutlet(oldDev, newDev, controlWaterOutletList)
    })

    ;(newLand.devices || []).forEach((nd) => {
      if (!oldLand.devices.some((d) => String(d.id) === String(nd.id))) {
        const copy = { ...nd, specificData: { ...(nd.specificData || {}) } }
        const pile = copy.specificData?.waterOutletPile
        if (pile) setPortsOpenStatus(pile)
        oldLand.devices.push(copy)
      }
    })

    oldLand.landName = newLand.landName
  })

  newList.forEach((nl) => {
    if (!oldList.some((l) => String(l.landId) === String(nl.landId))) {
      const devices = (nl.devices || []).map((d) => {
        const copy = { ...d, specificData: { ...(d.specificData || {}) } }
        const pile = copy.specificData?.waterOutletPile
        if (pile) setPortsOpenStatus(pile)
        return copy
      })
      oldList.push({ ...nl, devices })
    }
  })

  return oldList
}

/** 初始化列表中所有设备端口 isOpen */
export function initDeviceLandListPorts(deviceLandList) {
  if (!Array.isArray(deviceLandList)) return deviceLandList
  return deviceLandList.map((land) => ({
    ...land,
    devices: (land.devices || []).map((d) => {
      const copy = { ...d, specificData: { ...(d.specificData || {}) } }
      const pile = copy.specificData?.waterOutletPile
      if (pile) setPortsOpenStatus(pile)
      return copy
    })
  }))
}

/**
 * 单设备状态 merge（对齐移动端 control_device.mergeData）
 * oldDev / newDev 均为 status 接口结构（含 waterOutletPile）
 */
export function mergeDeviceStatus(oldDev, newDev, controlWaterOutletList) {
  if (!oldDev || !newDev) return
  const waterOut = newDev.waterOutletPile
  if (!waterOut) {
    Object.assign(oldDev, newDev)
    return
  }

  const oldWaterOut = controlWaterOutletList[waterOut.id]
  if (oldWaterOut) {
    if (oldWaterOut.valveAction !== 0 && waterOut.valveAction === 0) {
      let isReplace = false
      if (waterOut.outletType === 0) {
        isReplace = getReplace0(oldWaterOut, waterOut)
      }
      if (isReplace) {
        Object.assign(oldDev, newDev)
        setPortsOpenStatus(oldDev.waterOutletPile)
        delete controlWaterOutletList[waterOut.id]
      } else {
        const oldPorts = oldDev.waterOutletPile?.ports
        if (Array.isArray(waterOut.ports) && Array.isArray(oldPorts)) {
          waterOut.ports.forEach((newPort) => {
            const oldPort = oldPorts.find((p) => p.outletNo === newPort.outletNo)
            if (oldPort) {
              oldPort.currentOpening = newPort.currentOpening
              oldPort.pressure = newPort.pressure
            }
          })
        }
        if (oldDev.waterOutletPile) {
          oldDev.waterOutletPile.valveAction = waterOut.valveAction
          if (waterOut.flow != null) oldDev.waterOutletPile.flow = waterOut.flow
        }
      }
    } else {
      const oldPorts = oldDev.waterOutletPile?.ports
      if (Array.isArray(waterOut.ports) && Array.isArray(oldPorts)) {
        waterOut.ports.forEach((newPort) => {
          const oldPort = oldPorts.find((p) => p.outletNo === newPort.outletNo)
          if (oldPort) {
            oldPort.currentOpening = newPort.currentOpening
            oldPort.pressure = newPort.pressure
          }
        })
      }
      if (oldDev.waterOutletPile) {
        oldDev.waterOutletPile.valveAction = waterOut.valveAction
        if (waterOut.flow != null) oldDev.waterOutletPile.flow = waterOut.flow
      }
    }
  } else {
    Object.assign(oldDev, newDev)
    setPortsOpenStatus(oldDev.waterOutletPile)
  }
}
