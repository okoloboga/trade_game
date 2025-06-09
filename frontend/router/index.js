import { createRouter, createWebHistory } from 'vue-router'
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('@/views/MainView.vue') },
    { path: '/history', component: () => import('@/views/HistoryView.vue') },
    { path: '/wallet', component: () => import('@/views/WalletView.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('@/views/ErrorView.vue') },
  ],
})
