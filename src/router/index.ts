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
      props: (route) => ({
        repositoryId: route.params.repositoryId,
        documentPath: route.query.path || 'README.md',
        ref: route.query.ref || 'main'
      }),
      // URLの例: /documents/123?path=docs/guide.md&ref=main
      meta: {
        requiresRepository: true,
        description: 'ドキュメント表示ページ（クエリパラメータでドキュメントパスを指定）'
      }
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
    },
    // 後方互換性のためのリダイレクト（パスパラメータなしの場合）
    {
      path: '/documents/:repositoryId',
      redirect: (to) => {
        return {
          name: 'DocumentView',
          params: to.params,
          query: { 
            path: 'README.md',
            ref: 'main',
            ...to.query 
          }
        };
      }
    }
  ],
})

export default router
