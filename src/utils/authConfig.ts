const defaultAuthConfig: Authconfiguration = {
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
}

async function getAuthenticationConfig() {
	let customConfiguration = null
	try {
		customConfiguration = await import('@/configuration/authentication')
	} catch (e) {
		console.warn('Missing authorization configuration')
	}
	return customConfiguration?.default || defaultAuthConfig
}

export { getAuthenticationConfig }
