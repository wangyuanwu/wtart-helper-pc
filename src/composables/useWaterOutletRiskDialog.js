import { reactive } from 'vue'

/** 打开出水口 40102 风险提示文案 */
export const RISK_MSG_OPEN =
  '系统监测到该地块下其它出水口处于关闭状态，仍打开当前出水口可能会出现爆管风险'

/** 关闭出水口 40102 风险提示文案（对齐图2） */
export const RISK_MSG_CLOSE =
  '监测到当前其他出水口处于关闭状态,仍关闭该出水口有暴管风险'

const state = reactive({
  visible: false,
  message: '',
  confirmText: '确定',
  riskAcknowledged: false
})

let pendingResolve = null

export function useWaterOutletRiskDialogState() {
  return state
}

/**
 * 出水口强制开/关风险提示（须勾选「我已知晓该风险」后才能确定）
 * @returns {Promise<boolean>}
 */
export function confirmWaterOutletRisk({
  message,
  confirmText = '确定'
} = {}) {
  return new Promise((resolve) => {
    state.message = message || ''
    state.confirmText = confirmText
    state.riskAcknowledged = false
    state.visible = true
    pendingResolve = resolve
  })
}

export function resolveWaterOutletRisk(confirmed) {
  state.visible = false
  state.riskAcknowledged = false
  if (pendingResolve) {
    pendingResolve(!!confirmed)
    pendingResolve = null
  }
}

export function toggleWaterOutletRiskAck(checked) {
  state.riskAcknowledged = !!checked
}
