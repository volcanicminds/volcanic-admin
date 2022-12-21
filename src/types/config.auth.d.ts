interface Authconfiguration {
	request: {
		body: { reqEmailField: string; reqPasswordField: string }
		url: string
		method: 'POST' //for now only POST is supported
	}
	response: {
		body: {
			resEmailField: string
			resAuthTokenField: string
			resRolesField: string
		}
	}
}
