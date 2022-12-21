import Vue from 'vue'
import getHeaders from '@/api/headers'

export default function _find(source: string, query: string, authenticated = true) {
	return Vue.prototype.$axios({
		method: 'GET',
		url: `${source}${query}`,
		headers: getHeaders(authenticated)
	})
}
