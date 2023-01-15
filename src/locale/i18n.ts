import Vue from 'vue'
import VueI18n from 'vue-i18n'
import { getLocaleLanguage } from '@/utils/locale'
import messages from '@/locale/messages'

const localeLanguage = getLocaleLanguage()
const mergedMessages = messages
try {
	const configurationMessages = await import('@/configuration/i18n/messages')
	Object.keys(messages).forEach((lang) => {
		mergedMessages[lang] = { ...configurationMessages.default[lang], ...mergedMessages[lang] }
	})
} catch (e) {
	console.warn(e)
}

Vue.use(VueI18n)
const i18n = new VueI18n({
	locale: localeLanguage,
	fallbackLocale: 'en',
	messages: mergedMessages
})

export default i18n
