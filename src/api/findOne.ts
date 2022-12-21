import Vue from 'vue'
import getHeaders from '@/api/headers'

export default function _get(source: string, id: string | number, authenticated = true) {
	return Vue.prototype.$axios({
		method: 'GET',
		url: `${source}/${id}`,
		headers: getHeaders(authenticated)
	})
}
