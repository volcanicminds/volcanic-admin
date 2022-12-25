import { defineStore } from 'pinia'
import Vue, { computed, ref } from 'vue'
import { useConfigurationStore } from '@/stores/configuration'
import { normalizeUser } from '@/utils/normalization'
import { types, save, clearAll, get } from '@/utils/localStorage'
import getHeaders from '@/api/headers'

export const useUserStore = defineStore('user', () => {
	const userFromLocalStorage = get(types.USER)
	const authFromLocalStorage = get(types.AUTH)

	const email = ref(userFromLocalStorage[types.USER_EMAIL])

	const token = ref(authFromLocalStorage[types.AUTH_TOKEN])
	const roles = ref(authFromLocalStorage[types.AUTH_ROLES])

	const isLogged = computed(() => !!token.value)

	async function login(_email: string, _password: string) {
		const configurationStore = useConfigurationStore()
		const { request, response } = configurationStore.authentication
		const {
			body: { reqEmailField, reqPasswordField },
			url,
			method
		} = request
		const {
			body: { resEmailField, resAuthTokenField, resRolesField }
		} = response

		let loginResponse = null
		try {
			loginResponse = await Vue.prototype.$axios({
				headers: getHeaders(false),
				method,
				url,
				data: {
					[reqEmailField]: _email,
					[reqPasswordField]: _password
				}
			})
		} catch (e) {
			console.error('Error during login', e)
			Vue.$toast.open({ message: Vue.$t('toasts.errorLogin'), type: 'error', position: 'bottom' })
			throw e
		}

		if (loginResponse) {
			const user = normalizeUser(loginResponse?.data) || {}

			email.value = user[resEmailField] || _email
			token.value = user[resAuthTokenField]
			roles.value = user[resRolesField]

			save(types.USER, { [types.USER_EMAIL]: email.value })
			save(types.AUTH, { [types.AUTH_TOKEN]: token.value, [types.AUTH_ROLES]: roles.value })
		}
	}

	function logout() {
		token.value = ''
		roles.value = []

		clearAll([types.USER])

		const configurationStore = useConfigurationStore()
		configurationStore.resetToDefault()
	}

	return { email, token, roles, isLogged, login, logout }
})
