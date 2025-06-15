import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'

// PrimeVueコンポーネント
import Card from 'primevue/card'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'

// PrimeVueスタイル
// import 'primevue/resources/themes/lara-light-indigo/theme.css'
// import 'primevue/resources/primevue.min.css'
// import 'primeicons/primeicons.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue)

// コンポーネント登録
app.component('Card', Card)
app.component('Message', Message)
app.component('ProgressSpinner', ProgressSpinner)

app.mount('#app')
