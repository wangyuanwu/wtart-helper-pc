<template>
  <teleport to="body">
    <div
      v-if="state.visible"
      class="water-outlet-risk-mask"
      @click.self="onCancel"
    >
      <div
        class="water-outlet-risk-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="water-outlet-risk-title"
        @click.stop
      >
        <h3 id="water-outlet-risk-title" class="water-outlet-risk-dialog__title">
          提示
        </h3>
        <p class="water-outlet-risk-dialog__message">
          {{ state.message }}
        </p>
        <label class="water-outlet-risk-dialog__ack">
          <span
            class="water-outlet-risk-dialog__radio"
            :class="{ 'is-checked': state.riskAcknowledged }"
            aria-hidden="true"
          ></span>
          <input
            v-model="ackChecked"
            type="checkbox"
            class="water-outlet-risk-dialog__checkbox"
          />
          <span class="water-outlet-risk-dialog__ack-text">我已知晓该风险</span>
        </label>
        <div class="water-outlet-risk-dialog__footer">
          <button
            type="button"
            class="water-outlet-risk-dialog__btn is-cancel"
            @click="onCancel"
          >
            取消
          </button>
          <button
            type="button"
            class="water-outlet-risk-dialog__btn is-confirm"
            :disabled="!state.riskAcknowledged"
            @click="onConfirm"
          >
            {{ state.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { computed } from 'vue'
import {
  resolveWaterOutletRisk,
  toggleWaterOutletRiskAck,
  useWaterOutletRiskDialogState
} from '@/composables/useWaterOutletRiskDialog'

const state = useWaterOutletRiskDialogState()

const ackChecked = computed({
  get: () => state.riskAcknowledged,
  set: (val) => toggleWaterOutletRiskAck(val)
})

const onCancel = () => {
  resolveWaterOutletRisk(false)
}

const onConfirm = () => {
  if (!state.riskAcknowledged) return
  resolveWaterOutletRisk(true)
}
</script>

<style scoped>
.water-outlet-risk-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
  padding: 24px;
  box-sizing: border-box;
}

.water-outlet-risk-dialog {
  width: min(420px, 100%);
  padding: 28px 28px 24px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.18);
  box-sizing: border-box;
}

.water-outlet-risk-dialog__title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  text-align: center;
  line-height: 1.4;
}

.water-outlet-risk-dialog__message {
  margin: 0 0 20px;
  font-size: 14px;
  color: #606266;
  line-height: 1.7;
  text-align: center;
}

.water-outlet-risk-dialog__ack {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  cursor: pointer;
  user-select: none;
}

.water-outlet-risk-dialog__checkbox {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.water-outlet-risk-dialog__radio {
  width: 18px;
  height: 18px;
  border: 2px solid #c0c4cc;
  border-radius: 50%;
  flex-shrink: 0;
  box-sizing: border-box;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.water-outlet-risk-dialog__radio.is-checked {
  border-color: #3653a0;
  background: radial-gradient(circle at center, #3653a0 0 5px, transparent 6px);
}

.water-outlet-risk-dialog__ack-text {
  font-size: 14px;
  color: #909399;
  line-height: 1.4;
}

.water-outlet-risk-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.water-outlet-risk-dialog__btn {
  min-width: 88px;
  height: 36px;
  padding: 0 20px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  line-height: 1;
}

.water-outlet-risk-dialog__btn.is-cancel {
  border: 1px solid #dcdfe6;
  background: #fff;
  color: #303133;
}

.water-outlet-risk-dialog__btn.is-cancel:hover {
  border-color: #c0c4cc;
  color: #1a1a1a;
}

.water-outlet-risk-dialog__btn.is-confirm {
  border: none;
  background: #274082;
  color: #fff;
}

.water-outlet-risk-dialog__btn.is-confirm:hover:not(:disabled) {
  background: #1f3468;
}

.water-outlet-risk-dialog__btn.is-confirm:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
