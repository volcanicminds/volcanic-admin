import { camelCase } from 'lodash'

function normalizeUser(user: User) {
	return user
}

function normalizeDetailTabKey(name: string) {
	return camelCase(name.toLowerCase())
}

export { normalizeUser, normalizeDetailTabKey }
