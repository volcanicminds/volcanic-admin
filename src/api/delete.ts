import Vue from 'vue'
import getHeaders from '@/api/headers'

export default function _delete(source: string, id: string, authenticated = true) {
	return Vue.prototype.$axios({
		method: 'DELETE',
		url: `${source}/${id}`,
		headers: getHeaders(authenticated)
	})
}
