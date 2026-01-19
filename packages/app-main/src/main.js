import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import Settings from './views/Settings.vue'
import StreamerMarket from './views/StreamerMarket.vue'
import Privacy from './views/Privacy.vue'
import Terms from './views/Terms.vue'
import './styles/global.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/market', component: StreamerMarket },
    { path: '/settings', component: Settings },
    { path: '/privacy', component: Privacy },
    { path: '/terms', component: Terms },
    { path: '/streamer/:streamer_id', name: 'streamer-detail', component: () => import('./views/StreamerDetail.vue') },
    { path: '/recording/:video_id', name: 'recording', component: () => import('./views/RecordingDetail.vue') }
  ]
})

const app = createApp(App)
app.use(router)
app.mount('#app')
