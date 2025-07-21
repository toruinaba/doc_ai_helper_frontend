import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 現在はMainLayoutを直接使用しているため、ルートは定義しない
    // 将来的にルーティングが必要になった場合はここにルートを追加
  ],
})

export default router
