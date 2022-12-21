export function objectToQueryParams(params: ApiGenericParams) {
	return Object.keys(params)
		.map((key) => key + '=' + params[key])
		.join('&')
}

export const DEFAULT_RELATION_SEPARATOR = '.'
