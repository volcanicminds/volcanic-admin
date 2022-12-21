import Vue from 'vue'
import getHeaders from '@/api/headers'

export default function _create(source: string, data: ApiRequestBody, authenticated = true) {
	return Vue.prototype.$axios({
		method: 'POST',
		url: source,
		data,
		headers: getHeaders(authenticated)
	})
}
