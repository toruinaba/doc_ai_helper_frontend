import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/Home.vue'),
    },
    {
      path: '/documents/:repositoryId',
      name: 'DocumentView',
      component: () => import('../views/DocumentView.vue'),
    },
    {
      path: '/admin/repositories',
      name: 'RepositoryManagement',
      component: () => import('../views/RepositoryManagement.vue'),
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('../views/Settings.vue'),
    },
    // レガシーリダイレクト
    {
      path: '/repositories',
      redirect: '/admin/repositories'
    }
  ],
})

export default router
