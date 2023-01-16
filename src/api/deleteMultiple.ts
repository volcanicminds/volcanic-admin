import Vue from 'vue'
import getHeaders from '@/api/headers'

export default function _deleteMultiple(source: string, ids: Array<string>, authenticated = true) {
	return Vue.prototype.$axios({
		method: 'DELETE',
		url: source,
		data: { ids },
		headers: getHeaders(authenticated)
	})
}
