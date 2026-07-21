import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getFarmList } from '@/api/map'

const farmChangeListeners = new Set()

export const useFarmStore = defineStore(
  'farm',
  () => {
    const s_farm_list = ref([])
    const isFarmEmpty = ref(true)
    const selectFarm = ref(null)
    const s_selectFarm = ref(null)

    function syncSelectFarm(farmList) {
      if (!farmList.length) {
        selectFarm.value = null
        s_selectFarm.value = null
        return
      }

      const cached = s_selectFarm.value
      if (cached?.id != null) {
        const matched = farmList.find((item) => item.id === cached.id)
        if (matched) {
          selectFarm.value = { ...matched }
          s_selectFarm.value = { ...matched }
          return
        }
      }

      selectFarm.value = { ...farmList[0] }
      s_selectFarm.value = { ...farmList[0] }
    }

    async function fetchFarmList(searchText = '') {
      try {
        const params = searchText ? { searchText } : {}
        const res = await getFarmList(params)
        const farmList = Array.isArray(res.data) ? res.data : []

        if (!farmList.length) {
          isFarmEmpty.value = true
          s_farm_list.value = []
          selectFarm.value = null
          farmChange()
          return farmList
        }

        isFarmEmpty.value = false
        s_farm_list.value = farmList
        syncSelectFarm(farmList)
        farmChange()
        return farmList
      } catch (e) {
        isFarmEmpty.value = true
        s_farm_list.value = []
        selectFarm.value = null
        throw e
      }
    }

    function setSelectFarm(farm) {
      if (!farm) return
      selectFarm.value = { ...farm }
      s_selectFarm.value = { ...farm }
      farmChange()
    }

    function farmChange() {
      const payload = {
        topic: 'farmChange',
        data: '农场更新',
        selectFarm: selectFarm.value,
        farmList: s_farm_list.value
      }
      farmChangeListeners.forEach((listener) => listener(payload))
    }

    function onFarmChange(listener) {
      farmChangeListeners.add(listener)
      return () => farmChangeListeners.delete(listener)
    }

    function resetFarm() {
      s_farm_list.value = []
      isFarmEmpty.value = true
      selectFarm.value = null
      s_selectFarm.value = null
    }

    return {
      s_farm_list,
      isFarmEmpty,
      selectFarm,
      s_selectFarm,
      fetchFarmList,
      setSelectFarm,
      farmChange,
      onFarmChange,
      resetFarm
    }
  },
  {
    persist: {
      pick: ['s_selectFarm']
    }
  }
)
