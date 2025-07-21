import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'

// PrimeVueサービス
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'

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
import Tooltip from 'primevue/tooltip'
import Checkbox from 'primevue/checkbox'
import RadioButton from 'primevue/radiobutton'
import Dropdown from 'primevue/dropdown'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import Dialog from 'primevue/dialog'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import Menu from 'primevue/menu'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import SelectButton from 'primevue/selectbutton'
import Paginator from 'primevue/paginator'
import Skeleton from 'primevue/skeleton'
import Password from 'primevue/password'

// PrimeVueスタイル（v4の場合、テーマは自動適用されるためコメントアウト）
// import 'primevue/resources/themes/aura-light-blue/theme.css'
import 'primeicons/primeicons.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.p-dark', // 明示的にダークモードクラスが必要
      cssLayer: false
    }
  }
})
app.use(ConfirmationService)
app.use(ToastService)

// ディレクティブ登録
app.directive('tooltip', Tooltip)

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
app.component('Checkbox', Checkbox)
app.component('RadioButton', RadioButton)
app.component('Dropdown', Dropdown)
app.component('Select', Select)
app.component('Tag', Tag)
app.component('ProgressBar', ProgressBar)
app.component('Dialog', Dialog)
app.component('ConfirmDialog', ConfirmDialog)
app.component('Toast', Toast)
app.component('Menu', Menu)
app.component('IconField', IconField)
app.component('InputIcon', InputIcon)
app.component('SelectButton', SelectButton)
app.component('Paginator', Paginator)
app.component('Skeleton', Skeleton)
app.component('Password', Password)

app.mount('#app')
