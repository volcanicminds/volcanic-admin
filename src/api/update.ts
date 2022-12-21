import Vue from 'vue'
import getHeaders from '@/api/headers'

export default function _update(source: string, id: string, data: ApiRequestBody, authenticated = true) {
	return Vue.prototype.$axios({
		method: 'PUT',
		url: `${source}/${id}`,
		data,
		headers: getHeaders(authenticated)
	})
}
