import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home/Home.vue'
import { useUserStore } from '../store/user'

const routes = [
  {
    path: '/login',
    component: () => import('../views/Login/Index.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/forgot-password',
    component: () => import('../views/Login/ForgotPassword.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: Home,
    meta: { title: '首页', requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/map'
      },
      {
        path: 'map',
        component: () => import('../views/Map/Index.vue'),
        meta: { title: '地图', requiresAuth: true }
      },
      {
        path: 'map/chose-farm',
        component: () => import('../views/Map/MapChoseFarm.vue'),
        meta: { title: '新建农场', requiresAuth: true, farmCreate: true }
      },
      {
        path: 'map/edit-group',
        component: () => import('../views/Map/MapEditGroup.vue'),
        meta: { title: '新建轮灌组', requiresAuth: true }
      },
      {
        path: 'map/edit-plot',
        component: () => import('../views/Map/MapEditPlot.vue'),
        meta: { title: '新建地块', requiresAuth: true }
      },
      {
        path: 'map/add-edit-land',
        component: () => import('../views/Map/AddEditLand.vue'),
        meta: { title: '保存地块', requiresAuth: true }
      },
      {
        path: 'farm/add',
        component: () => import('../views/Farm/AddFarm.vue'),
        meta: { title: '新建农场', requiresAuth: true, farmCreate: true }
      },
      {
        path: 'farm/edit',
        component: () => import('../views/Farm/EditFarm.vue'),
        meta: { title: '农场设置', requiresAuth: true }
      },
      {
        path: 'farm/edit-member',
        component: () => import('../views/Farm/EditFarmMember.vue'),
        meta: { title: '农场成员', requiresAuth: true }
      },
      {
        path: 'farm/edit-land',
        component: () => import('../views/Farm/EditLand.vue'),
        meta: { title: '编辑地块', requiresAuth: true }
      },
      {
        path: 'device',
        component: () => import('../views/Device/Index.vue'),
        meta: { title: '设备管理', requiresAuth: true }
      },
      {
        path: 'device/add',
        component: () => import('../views/Device/AddDevice.vue'),
        meta: { title: '选择设备类型', requiresAuth: true }
      },
      {
        path: 'device/add-number',
        component: () => import('../views/Device/AddDeviceNumber.vue'),
        meta: { title: '添加出水桩', requiresAuth: true }
      },
      {
        path: 'device/add-location',
        component: () => import('../views/Device/AddDeviceLocation.vue'),
        meta: { title: '设备定位', requiresAuth: true }
      },
      {
        path: 'map/edit-device',
        component: () => import('../views/Map/MapEditDevice.vue'),
        meta: { title: '添加设备', requiresAuth: true }
      },
      {
        path: 'device/control',
        component: () => import('../views/Device/ControlDevice.vue'),
        meta: { title: '设备控制', requiresAuth: true }
      },
      {
        path: 'device/detail',
        component: () => import('../views/Device/DeviceDetail.vue'),
        meta: { title: '出水桩设置', requiresAuth: true }
      },
      {
        path: 'irrigation-group',
        component: () => import('../views/IrrigationGroup/Index.vue'),
        meta: { title: '轮灌组', requiresAuth: true }
      },
      {
        path: 'irrigation-group/detail',
        component: () => import('../views/IrrigationGroup/GroupDetail.vue'),
        meta: { title: '轮灌组详情', requiresAuth: true }
      },
      {
        path: 'irrigation-group/edit',
        component: () => import('../views/IrrigationGroup/GroupEdit.vue'),
        meta: { title: '轮灌组编辑', requiresAuth: true }
      },
      {
        path: 'irrigation-program',
        component: () => import('../views/IrrigationProgram/Index.vue'),
        meta: { title: '轮灌程序', requiresAuth: true }
      },
      {
        path: 'irrigation-program/edit',
        component: () => import('../views/IrrigationProgram/ProgramEdit.vue'),
        meta: { title: '轮灌程序编辑', requiresAuth: true }
      },
      {
        path: 'alarm',
        component: () => import('../views/Alarm/Index.vue'),
        meta: { title: '预警信息', requiresAuth: true }
      },
      {
        path: 'alarm/set',
        component: () => import('../views/Alarm/AlarmSet.vue'),
        meta: { title: '预警设置', requiresAuth: true }
      },
      {
        path: 'user/profile',
        component: () => import('../views/User/Profile.vue'),
        meta: { title: '个人信息', requiresAuth: true }
      },
      {
        path: 'user/pwd',
        component: () => import('../views/User/Pwd.vue'),
        meta: { title: '修改密码', requiresAuth: true }
      }
    ]
  },
  {
    path: '/404',
    component: () => import('../views/NotFound/Index.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.VITE_APP_BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const isLoggedIn = !!userStore.token

  if (to.meta.requiresAuth !== false && !isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && isLoggedIn) {
    next('/map')
  } else {
    next()
  }
})

export default router
