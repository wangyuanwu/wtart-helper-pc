<template>
  <div class="outlet-port-selector">
    <div
      v-for="(group, gIndex) in portGroupList"
      :key="gIndex"
      class="outlet-port-selector__group"
      :class="{ 'has-border': group.isNeedBorder }"
    >
      <button
        v-for="port in group.list"
        :key="port.id"
        type="button"
        class="outlet-port-selector__btn"
        :class="{ 'is-checked': port.isCheck }"
        @click.stop="handleClick(port)"
      >
        {{ port.outletName }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  outletType: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue', 'port-change'])

const portList = computed({
  get: () => props.modelValue || [],
  set: (val) => {
    emit('update:modelValue', val)
    emit('port-change', val)
  }
})

const portGroupList = computed(() => {
  const list = portList.value
  const type = props.outletType
  if (type === 4) {
    const groupAC = []
    const groupBD = []
    list.forEach((item) => {
      const no = Number(item.outletNo)
      if (no === 1 || no === 3) groupAC.push(item)
      else if (no === 2 || no === 4) groupBD.push(item)
    })
    return [
      { list: groupAC, isNeedBorder: true },
      { list: groupBD, isNeedBorder: true }
    ]
  }
  return [{ list, isNeedBorder: false }]
})

function handleClick(clickPort) {
  const type = props.outletType
  const currList = portList.value.map((p) => ({ ...p }))
  const clickNo = Number(clickPort.outletNo)
  const target = currList.find((p) => p.id === clickPort.id)
  if (!target) return

  switch (type) {
    case 0: {
      const isCurrentChecked = target.isCheck
      currList.forEach((port) => {
        port.isCheck = port.id === clickPort.id && !isCurrentChecked
      })
      break
    }
    case 1:
    case 3:
      target.isCheck = !target.isCheck
      break
    case 2: {
      const newStatus = !target.isCheck
      currList.forEach((port) => {
        port.isCheck = newStatus
      })
      break
    }
    case 4: {
      let targetGroup = []
      let otherGroup = []
      if (clickNo === 1 || clickNo === 3) {
        targetGroup = currList.filter((p) => {
          const n = Number(p.outletNo)
          return n === 1 || n === 3
        })
        otherGroup = currList.filter((p) => {
          const n = Number(p.outletNo)
          return n === 2 || n === 4
        })
      } else {
        targetGroup = currList.filter((p) => {
          const n = Number(p.outletNo)
          return n === 2 || n === 4
        })
        otherGroup = currList.filter((p) => {
          const n = Number(p.outletNo)
          return n === 1 || n === 3
        })
      }
      const groupStatus = !target.isCheck
      targetGroup.forEach((p) => {
        p.isCheck = groupStatus
      })
      otherGroup.forEach((p) => {
        p.isCheck = false
      })
      break
    }
    default:
      target.isCheck = !target.isCheck
  }

  portList.value = currList
}
</script>

<style scoped>
.outlet-port-selector {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 8px;
}

.outlet-port-selector__group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.outlet-port-selector__group.has-border {
  padding: 4px 6px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
}

.outlet-port-selector__btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #909399;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}

.outlet-port-selector__btn.is-checked {
  background: #3653a0;
}

.outlet-port-selector__btn:hover {
  opacity: 0.9;
}
</style>
