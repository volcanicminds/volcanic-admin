import { useConfigurationStore } from '@/stores/configuration'
import { useUserStore } from '@/stores/user'

export default function getHeaders(authenticated = true) {
	const configuration = useConfigurationStore()
	const user = useUserStore()

	return {
		...configuration.httpHeaders,
		...(authenticated
			? {
					Authorization: 'Bearer ' + user.token
			  }
			: {})
	}
}
