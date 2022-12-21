import Vue from 'vue'
import getHeaders from '@/api/headers'

export default function _count(source: string, query: string, authenticated = true) {
	return Vue.prototype.$axios({
		method: 'GET',
		url: `${source}/count${query}`,
		headers: getHeaders(authenticated)
	})
}
