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
    /** 添加设备流程中的待添加列表，对齐移动端 vuex_edit_device */
    const s_edit_device = ref([])
    /** 定位结果（成功/失败列表），对齐移动端 vuex_edit_device_map */
    const s_edit_device_map = ref({
      deviceListOK: [],
      deviceListNo: []
    })
    /** 地图编辑页确认回传，对齐移动端 deviceMsg editConform */
    const s_pending_device_edit = ref(null)
    /** 新建轮灌组草稿，对齐移动端 vuex_add_group */
    const s_add_group = ref(null)
    /** 圈定轮灌区时的地块 id，对齐移动端 vuex_landId_group */
    const s_landId_group = ref(null)
    /** 选出水口设备列表（含 outletPorts），对齐移动端 vuex_group_deviceList */
    const s_group_deviceList = ref([])
    /** 列表进入详情的组条目，对齐移动端 vuex_group_list_item */
    const s_group_list_item = ref(null)
    /** 轮灌组详情缓存，对齐移动端 vuex_group_detail_info */
    const s_group_detail_info = ref(null)
    /** 编辑页选出水口预选，对齐移动端 vuex_chose_port */
    const s_chose_port = ref(null)
    /** 编辑页草稿（PC 跳转子页会卸载，需持久），对齐移动端 group_edit.groupParam */
    const s_edit_group_draft = ref(null)
    /** 子页回写：changePort / changeLand，对齐移动端 groupChangeMsg */
    const s_pending_group_change = ref(null)

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

    function setEditDevice(list) {
      s_edit_device.value = Array.isArray(list)
        ? list.map((item) => ({ ...item }))
        : []
    }

    function setEditDeviceMap(payload) {
      // 兼容移动端 edit 态直接写入数组
      if (Array.isArray(payload)) {
        s_edit_device_map.value = {
          deviceListOK: payload.map((item) => ({ ...item })),
          deviceListNo: []
        }
        return
      }
      const ok = Array.isArray(payload?.deviceListOK)
        ? payload.deviceListOK.map((item) => ({ ...item }))
        : []
      const no = Array.isArray(payload?.deviceListNo)
        ? payload.deviceListNo.map((item) => ({ ...item }))
        : []
      s_edit_device_map.value = {
        deviceListOK: ok,
        deviceListNo: no
      }
    }

    function setPendingDeviceEdit(list) {
      s_pending_device_edit.value = Array.isArray(list)
        ? list.map((item) => ({ ...item }))
        : null
    }

    function consumePendingDeviceEdit() {
      const list = s_pending_device_edit.value
      s_pending_device_edit.value = null
      return list
    }

    function setAddGroup(params) {
      s_add_group.value = params ? { ...params } : null
    }

    function setLandIdGroup(id) {
      s_landId_group.value = id ?? null
    }

    function setGroupDeviceList(list) {
      s_group_deviceList.value = Array.isArray(list)
        ? list.map((item) => ({
            ...item,
            outletPorts: Array.isArray(item.outletPorts)
              ? item.outletPorts.map((p) => ({ ...p }))
              : []
          }))
        : []
    }

    function patchAddGroupArea(area, areaJson) {
      if (!s_add_group.value) return
      s_add_group.value = {
        ...s_add_group.value,
        area,
        areaJson
      }
    }

    function setGroupListItem(item) {
      s_group_list_item.value = item ? { ...item } : null
    }

    /** 轮灌程序列表项/编辑缓存，对齐移动端 vuex_pro_info */
    const s_pro_info = ref(null)

    function setProInfo(info) {
      s_pro_info.value = info ? { ...info } : null
    }

    function setGroupDetailInfo(info) {
      s_group_detail_info.value = info ? { ...info } : null
    }

    function setChosePort(params) {
      s_chose_port.value = params
        ? {
            ...params,
            outlets: Array.isArray(params.outlets)
              ? params.outlets.map((o) => ({ ...o }))
              : []
          }
        : null
    }

    function setEditGroupDraft(params) {
      s_edit_group_draft.value = params
        ? {
            ...params,
            outlets: Array.isArray(params.outlets)
              ? params.outlets.map((o) => ({ ...o }))
              : []
          }
        : null
    }

    function setPendingGroupChange(payload) {
      s_pending_group_change.value = payload
        ? { topic: payload.topic, data: payload.data }
        : null
    }

    function consumePendingGroupChange() {
      const v = s_pending_group_change.value
      s_pending_group_change.value = null
      return v
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
      s_edit_device.value = []
      s_edit_device_map.value = { deviceListOK: [], deviceListNo: [] }
      s_pending_device_edit.value = null
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
      s_edit_device,
      s_edit_device_map,
      s_pending_device_edit,
      s_add_group,
      s_landId_group,
      s_group_deviceList,
      s_group_list_item,
      s_group_detail_info,
      s_pro_info,
      s_chose_port,
      s_edit_group_draft,
      s_pending_group_change,
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
      setEditDevice,
      setEditDeviceMap,
      setPendingDeviceEdit,
      consumePendingDeviceEdit,
      setAddGroup,
      setLandIdGroup,
      setGroupDeviceList,
      patchAddGroupArea,
      setGroupListItem,
      setGroupDetailInfo,
      setProInfo,
      setChosePort,
      setEditGroupDraft,
      setPendingGroupChange,
      consumePendingGroupChange,
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
