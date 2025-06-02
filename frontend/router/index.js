import { createRouter, createWebHistory } from 'vue-router'
   import MainView from '@/views/MainView.vue'
   import HistoryView from '@/views/HistoryView.vue'
   import ErrorView from '@/views/ErrorView.vue'

   export const router = createRouter({
     history: createWebHistory(),
     routes: [
       { path: '/', component: MainView },
       { path: '/history', component: HistoryView },
       { path: '/:pathMatch(.*)*', component: ErrorView },
     ],
   })
