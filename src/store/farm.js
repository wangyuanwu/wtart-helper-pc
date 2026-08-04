import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getFarmList, getFarmInfo } from '@/api/map'

const farmChangeListeners = new Set()

export const useFarmStore = defineStore(
  'farm',
  () => {
    const s_farm_list = ref([])
    /** 全量农场列表缓存（不受搜索过滤影响，不持久化） */
    const s_farm_list_all = ref([])
    const isFarmEmpty = ref(true)
    const isFarmLoading = ref(false)
    const selectFarm = ref(null)
    const s_selectFarm = ref(null)
    const s_farm_info = ref(null)
    /** 选点页确认的位置，对齐移动端 vuex_locaiton */
    const s_location = ref(null)
    /**
     * 编辑农场地址回填缓冲（对齐移动端 farmEditMsg / locationChange）
     * 选点页 type=edit 确认后写入；EditFarm 重新挂载消费后回填，避免被详情接口旧地址覆盖
     */
    const s_pending_farm_location = ref(null)
    /** 圈地页保存的地块草稿，对齐移动端 vuex_land */
    const s_land = ref(null)
    /** 农场设置页成员编辑缓存，对齐移动端 vuex_member_info */
    const s_member_info = ref(null)
    /** 农场设置页地块列表缓存，对齐移动端 vuex_land_list */
    const s_land_list = ref([])
    /** 设备控制页当前设备，对齐移动端 vuex_control_device_info */
    const s_control_device = ref(null)
    /** 设备控制页状态缓存（默认开度页），对齐移动端 vuex_dv_status_info */
    const s_dv_status_info = ref(null)
    /** 控制页「打开地图」待聚焦设备 id，对齐移动端 farmChangeMsg openMap */
    const s_pending_map_device_id = ref(null)

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

    function restoreFarmList() {
      if (s_farm_list_all.value.length) {
        s_farm_list.value = s_farm_list_all.value.map((item) => ({ ...item }))
        return true
      }
      return false
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
            s_farm_list_all.value = []
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
          s_farm_list_all.value = farmList.map((item) => ({ ...item }))
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
          s_farm_list_all.value = []
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

    function setLocation(location) {
      s_location.value = location
        ? {
            lng: location.lng,
            lat: location.lat,
            address: location.address || ''
          }
        : null
    }

    /** 对齐移动端 uni.$emit('farmEditMsg', { topic: 'locationChange', data }) */
    function setPendingFarmLocation(location) {
      s_pending_farm_location.value = location
        ? {
            lng: location.lng,
            lat: location.lat,
            address: location.address || ''
          }
        : null
    }

    function consumePendingFarmLocation() {
      const pending = s_pending_farm_location.value
      s_pending_farm_location.value = null
      return pending
    }

    function setLand(land) {
      s_land.value = land ? { ...land } : null
    }

    function setMemberInfo(info) {
      s_member_info.value = info ? { ...info } : null
    }

    function setLandList(list) {
      s_land_list.value = Array.isArray(list)
        ? list.map((item) => ({ ...item }))
        : []
    }

    function setControlDevice(device) {
      s_control_device.value = device ? { ...device } : null
    }

    function setDvStatusInfo(info) {
      s_dv_status_info.value = info ? { ...info } : null
    }

    function setPendingMapDeviceId(id) {
      s_pending_map_device_id.value = id != null ? id : null
    }

    function consumePendingMapDeviceId() {
      const id = s_pending_map_device_id.value
      s_pending_map_device_id.value = null
      return id
    }

    function setFarmInfo(info) {
      s_farm_info.value = info || null
    }

    function farmChange() {
      const payload = {
        topic: 'farmChange',
        data: '农场更新',
        selectFarm: selectFarm.value,
        farmList: s_farm_list_all.value.length
          ? s_farm_list_all.value
          : s_farm_list.value
      }
      farmChangeListeners.forEach((listener) => listener(payload))
    }

    function onFarmChange(listener) {
      farmChangeListeners.add(listener)
      return () => farmChangeListeners.delete(listener)
    }

    function resetFarm() {
      s_farm_list.value = []
      s_farm_list_all.value = []
      isFarmEmpty.value = true
      isFarmLoading.value = false
      selectFarm.value = null
      s_selectFarm.value = null
      s_farm_info.value = null
      s_location.value = null
      s_pending_farm_location.value = null
      s_land.value = null
      s_member_info.value = null
      s_land_list.value = []
      s_control_device.value = null
      s_dv_status_info.value = null
      s_pending_map_device_id.value = null
    }

    return {
      s_farm_list,
      s_farm_list_all,
      isFarmEmpty,
      isFarmLoading,
      selectFarm,
      s_selectFarm,
      s_farm_info,
      s_location,
      s_pending_farm_location,
      s_land,
      s_member_info,
      s_land_list,
      s_control_device,
      s_dv_status_info,
      s_pending_map_device_id,
      fetchFarmList,
      fetchFarmFullInfo,
      setFarmInfo,
      setLocation,
      setPendingFarmLocation,
      consumePendingFarmLocation,
      setLand,
      setMemberInfo,
      setLandList,
      setControlDevice,
      setDvStatusInfo,
      setPendingMapDeviceId,
      consumePendingMapDeviceId,
      setSelectFarm,
      restoreFarmList,
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
