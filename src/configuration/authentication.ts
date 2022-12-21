const authenticationConfig: Authconfiguration = {
	request: {
		body: { reqEmailField: 'username', reqPasswordField: 'password' },
		url: '/auth/login',
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

export default authenticationConfig
