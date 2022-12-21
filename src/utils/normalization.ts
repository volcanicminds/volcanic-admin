import { camelCase } from 'lodash'

function normalizeUser(user: User) {
	return user
}

function normalizeDetailTabName(title: string) {
	return camelCase(title.toLowerCase())
}

export { normalizeUser, normalizeDetailTabName }
