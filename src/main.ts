import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'

// PrimeVueコンポーネント
import Card from 'primevue/card'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Tree from 'primevue/tree'
import Button from 'primevue/button'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'

// PrimeVueスタイル
// import 'primevue/resources/themes/lara-light-blue/theme.css'
import 'primeicons/primeicons.css'

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
app.component('Tree', Tree)
app.component('Button', Button)
app.component('Splitter', Splitter)
app.component('SplitterPanel', SplitterPanel)
app.component('InputText', InputText)
app.component('Textarea', Textarea)

app.mount('#app')
