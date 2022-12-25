import Vue from 'vue'
import VueRouter from 'vue-router'
import { createPinia, PiniaVuePlugin } from 'pinia'
import VueI18n from 'vue-i18n'
import router from '@/router'
import App from '@/App.vue'
import vuetify from '@/plugins/vuetify'
import { ValidationProvider, ValidationObserver, localize } from 'vee-validate'
import it from 'vee-validate/dist/locale/it.json'
import en from 'vee-validate/dist/locale/en.json'
import de from 'vee-validate/dist/locale/de.json'
import Fragment from 'vue-fragment'
import 'vue-toast-notification/dist/theme-default.css'
import VueToast from 'vue-toast-notification'
import 'normalize.css/normalize.css'
import 'basscss/css/basscss.min.css'
import '@/assets/main.styl'
import axios from 'axios'
import VueEasytable from 'vue-easytable'
import 'vue-easytable/libs/font/iconfont.css'
import itIT from '@/locale/table_itIT.js'
import deDE from '@/locale/table_deDE.js'
import enUS from 'vue-easytable/libs/locale/lang/en-US.js'
import messages from '@/locale/messages'
import { getLocaleLanguage } from '@/utils/locale'

/*
Localization EN, IT, DE
*/
const localeLanguage = getLocaleLanguage()

Vue.use(VueI18n)
const i18n = new VueI18n({
	locale: localeLanguage,
	fallbackLocale: 'en',
	messages
})

const pluginLanguages: PluginLocaleConfiguration = {
	it: {
		validation: it,
		table: itIT
	},
	en: {
		validation: en,
		table: enUS
	},
	de: {
		validation: de,
		table: deDE
	}
}

localize(localeLanguage, pluginLanguages[localeLanguage].validation)
VueEasytable.VeLocale.update(pluginLanguages[localeLanguage].table)
/*
End Localization
*/

Vue.use(VueEasytable)
Vue.prototype.$veLoading = VueEasytable.VeLoading

Vue.use(VueRouter)

Vue.use(Fragment.Plugin)
Vue.use(VueToast)

Vue.prototype.$axios = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL
})

Vue.component('ValidationObserver', ValidationObserver)
Vue.component('ValidationProvider', ValidationProvider)

Vue.use(PiniaVuePlugin)
const pinia = createPinia()

new Vue({
	i18n,
	pinia,
	router,
	vuetify,
	render: (h) => h(App)
}).$mount('#app')
