import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getFarmList, getFarmInfo } from '@/api/map'

const farmChangeListeners = new Set()

export const useFarmStore = defineStore(
  'farm',
  () => {
    const s_farm_list = ref([])
    const isFarmEmpty = ref(true)
    const isFarmLoading = ref(false)
    const selectFarm = ref(null)
    const s_selectFarm = ref(null)
    const s_farm_info = ref(null)

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
      isFarmLoading.value = true
      const keyword = typeof searchText === 'string' ? searchText.trim() : ''
      const isSearching = !!keyword
      try {
        const params = isSearching ? { searchText: keyword } : {}
        const res = await getFarmList(params)
        const farmList = Array.isArray(res.data) ? res.data : []

        if (!farmList.length) {
          s_farm_list.value = []
          // 搜索无结果只清空列表展示，不影响当前选中农场与空农场状态
          if (!isSearching) {
            isFarmEmpty.value = true
            selectFarm.value = null
            s_farm_info.value = null
            isFarmLoading.value = false
            farmChange()
          }
          return farmList
        }

        isFarmEmpty.value = false
        s_farm_list.value = farmList
        if (!isSearching) {
          syncSelectFarm(farmList)
          // 先结束 loading，再通知子模块，确保地图容器已可渲染
          isFarmLoading.value = false
          farmChange()
        }
        return farmList
      } catch (e) {
        if (!isSearching) {
          isFarmEmpty.value = true
          s_farm_list.value = []
          selectFarm.value = null
          s_farm_info.value = null
          isFarmLoading.value = false
          farmChange()
        }
        throw e
      } finally {
        isFarmLoading.value = false
      }
    }

    function setSelectFarm(farm) {
      if (!farm) return
      selectFarm.value = { ...farm }
      s_selectFarm.value = { ...farm }
      farmChange()
    }

    async function fetchFarmFullInfo(id) {
      if (id == null || id === '') {
        s_farm_info.value = null
        return null
      }
      const res = await getFarmInfo(id)
      s_farm_info.value = res.data || null
      return s_farm_info.value
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
      s_farm_info.value = null
    }

    return {
      s_farm_list,
      isFarmEmpty,
      isFarmLoading,
      selectFarm,
      s_selectFarm,
      s_farm_info,
      fetchFarmList,
      fetchFarmFullInfo,
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
