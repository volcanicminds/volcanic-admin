import Vue from 'vue'
import VueRouter from 'vue-router'
import { createPinia, PiniaVuePlugin } from 'pinia'
import router from '@/router'
import App from '@/App.vue'
import vuetify from '@/plugins/vuetify'
import { ValidationProvider, ValidationObserver, localize } from 'vee-validate'
import it from 'vee-validate/dist/locale/it.json'
import Fragment from 'vue-fragment'
import 'vue-toast-notification/dist/theme-default.css'
import VueToast from 'vue-toast-notification'
import 'normalize.css/normalize.css'
import 'basscss/css/basscss.min.css'
import '@/assets/main.styl'
import axios from 'axios'
import VueEasytable from 'vue-easytable'
import 'vue-easytable/libs/font/iconfont.css'
import itIT from '@/locale/itIT'

Vue.use(VueRouter)

Vue.use(Fragment.Plugin)
Vue.use(VueToast)

VueEasytable.VeLocale.update(itIT)
Vue.use(VueEasytable)

Vue.prototype.$veLoading = VueEasytable.VeLoading

Vue.prototype.$axios = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL
})

localize('it', it)
Vue.component('ValidationObserver', ValidationObserver)
Vue.component('ValidationProvider', ValidationProvider)

Vue.use(PiniaVuePlugin)
const pinia = createPinia()

new Vue({
	pinia,
	router,
	vuetify,
	render: (h) => h(App)
}).$mount('#app')
