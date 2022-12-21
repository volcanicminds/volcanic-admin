export const types = {
	USER: 'user',
	USER_USERNAME: 'username',
	USER_EMAIL: 'email',
	AUTH_TOKEN: 'token',
	AUTH_ROLES: 'roles',
	AUTH: 'auth',
	THEME: 'theme'
}

export function get(type: string) {
	const item = localStorage.getItem(type)

	return item ? JSON.parse(item || '') : ''
}

export function save(type: string, data: unknown) {
	localStorage.setItem(type, JSON.stringify(data))
}

export function remove(type: string) {
	localStorage.removeItem(type)
}

export function clearAll(exceptions?: Array<string>) {
	const dataToStore = {} as { [field: string]: unknown }
	const hasExceptions = exceptions && exceptions.length > 0
	if (hasExceptions) {
		exceptions.forEach((exc) => {
			dataToStore[exc] = get(exc)
		})
	}

	localStorage.clear()

	if (hasExceptions) {
		exceptions.forEach((exc) => {
			save(exc, dataToStore[exc])
		})
	}
}
