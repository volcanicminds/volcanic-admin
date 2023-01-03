import Vue from 'vue'
import VueI18n from 'vue-i18n'
import { getLocaleLanguage } from '@/utils/locale'
import messages from '@/locale/messages'

const localeLanguage = getLocaleLanguage()

Vue.use(VueI18n)
const i18n = new VueI18n({
	locale: localeLanguage,
	fallbackLocale: 'en',
	messages
})

export default i18n
