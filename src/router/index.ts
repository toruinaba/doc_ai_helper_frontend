import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../components/layout/MainLayout.vue'), // メインレイアウト
    },
    {
      path: '/repositories',
      name: 'RepositoryManagement',
      component: () => import('../views/RepositoryManagement.vue'),
    },
    // 将来的に追加される可能性のあるルート
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('../views/RepositoryManagement.vue'), // 一時的
    }
  ],
})

export default router
