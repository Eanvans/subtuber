import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import Settings from './views/Settings.vue'
import Privacy from './views/Privacy.vue'
import Terms from './views/Terms.vue'
import './styles/global.css'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash === '#clip-market') return { el: to.hash, top: 82 }
    return { top: 0 }
  },
  routes: [
    { path: '/', component: Home },
    { path: '/settings', name: 'settings', component: Settings },
    { path: '/recharge', name: 'recharge', component: () => import('./views/Recharge.vue') },
    { path: '/privacy', name: 'privacy', component: Privacy },
    { path: '/terms', name: 'terms', component: Terms },
    { path: '/streamer/:streamer_id', name: 'streamer-detail', component: () => import('./views/StreamerDetail.vue') },
    { path: '/recording/:video_id', name: 'recording', component: () => import('./views/RecordingDetail.vue') }
  ]
})

const app = createApp(App)
app.use(router)
app.mount('#app')
