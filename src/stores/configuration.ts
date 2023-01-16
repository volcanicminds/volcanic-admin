import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { RawAxiosRequestHeaders } from 'axios'
import { types, get, save } from '@/utils/localStorage'
import Vuetify from '@/plugins/vuetify'
import { THEMES } from '@/utils/constants'

// https://vitejs.dev/guide/assets.html
// Void stylesheet link creation
const easytableDarkThemeUrl = new URL('vue-easytable/libs/theme-dark/index.css', import.meta.url).href
const easytableDefaultThemeUrl = new URL('vue-easytable/libs/theme-default/index.css', import.meta.url).href
const easytableLink = document.createElement('link')
easytableLink.type = 'text/css'
easytableLink.rel = 'stylesheet'
document.head.appendChild(easytableLink)

export const useConfigurationStore = defineStore('configuration', () => {
	const defaults = {
		theme: THEMES.light
	}

	const httpHeaders = ref({ 'Content-Type': 'application/json' } as RawAxiosRequestHeaders)
	const updateStrategy = ref('synced' as UpdatesStrategies)
	const tableStrategy = ref('full' as TablesStrategies)
	const themeFromLocalStorage = get(types.THEME) || THEMES.light
	const theme = ref(themeFromLocalStorage as Themes)
	const menu = ref([] as Menu)
	const company = ref({} as ConfigurationCompany)
	const authentication = ref({
		request: {
			body: { reqEmailField: 'email', reqPasswordField: 'passwork' },
			url: '/authentication',
			method: 'POST'
		},
		response: {
			body: {
				resEmailField: 'email',
				resAuthTokenField: 'token',
				resRolesField: 'roles'
			}
		}
	} as Authconfiguration)
	const sources = ref(null as StoreSource)

	const api = ref({
		remapResponse: (a, b) => ({} as ApiResponseBody),
		remapSource: () => ''
	} as Api)

	async function setupAuthentication(_authentication: Authconfiguration) {
		try {
			let authToStore = null
			if (_authentication) {
				authToStore = _authentication
			} else {
				const defaultAuth = await import('@/configuration/authentication')
				authToStore = defaultAuth?.default
			}

			if (authToStore) {
				authentication.value = authToStore
			}
		} catch (e) {
			console.warn(e)
		}
	}

	async function setupBrand(_brand: ConfigurationCompany) {
		try {
			let brandToStore = null
			if (_brand) {
				brandToStore = _brand
			} else {
				const defaultBrand = await import('@/configuration/brand')
				brandToStore = defaultBrand?.default
			}
			company.value = brandToStore
		} catch (e) {
			console.warn(e)
		}
	}

	async function setupSources(_sources: StoreSource) {
		let sourcesToStore = {}
		if (_sources) {
			sourcesToStore = _sources
		} else {
			try {
				const defaultSources = await import('@/configuration/sources')
				sourcesToStore = defaultSources?.default
			} catch (e) {
				console.warn('Configuration model missing', e)
			}
		}
		sources.value = sourcesToStore
	}

	async function setupMenu(_menu: Menu) {
		let menuToStore = null
		if (_menu) {
			menuToStore = _menu
		} else {
			const defaultMenu = await import('@/configuration/menu')
			menuToStore = defaultMenu?.default
		}
		if (menuToStore) {
			menu.value = menuToStore
		}
	}

	async function setupApi(_api: Api) {
		let apiToStore = null
		if (_api) {
			apiToStore = _api
		} else {
			const defaultApi = await import('@/configuration/rest.default')
			apiToStore = defaultApi?.default
		}
		if (apiToStore) {
			api.value = apiToStore
		}
	}

	function changeTheme() {
		save(types.THEME, theme.value)
		const vuetifyThemeExists = Vuetify.framework.theme?.dark !== null

		if (theme.value === 'dark') {
			if (vuetifyThemeExists) {
				Vuetify.framework.theme.dark = true
			}
			// easytable dark theme in stylesheet link
			easytableLink.href = easytableDarkThemeUrl
		} else {
			if (vuetifyThemeExists) {
				Vuetify.framework.theme.dark = false
			}
			// easytable default theme in stylesheet link
			easytableLink.href = easytableDefaultThemeUrl
		}
	}

	changeTheme()

	watch(theme, changeTheme)

	function resetToDefault() {
		theme.value = defaults.theme
	}

	return {
		httpHeaders,
		updateStrategy,
		tableStrategy,
		theme,
		menu,
		setupMenu,
		company,
		resetToDefault,
		setupBrand,
		authentication,
		setupAuthentication,
		setupSources,
		sources,
		setupApi,
		api
	}
})
