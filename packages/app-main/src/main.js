import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import Settings from './views/Settings.vue'
import './styles/global.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/settings', component: Settings },
    { path: '/recording/:video_id', name: 'recording', component: () => import('./views/RecordingDetail.vue') }
  ]
})

const app = createApp(App)
app.use(router)
app.mount('#app')
