import _ from 'lodash'

function appendParams(url: string, params: string) {
	return `${url}${url.includes('?') ? '&' : '?'}${params}`
}

const ApiConfiguration = {
	remapResponse: function (source: string, data: ApiResponseBody) {
		return data
	},
	remapSource: function ({ filters, sorting, pagination }: TableRoutingParams) {
		let url = ''
		if (pagination && Object.keys(pagination).length > 0) {
			const { pageIndex, pageSize = process.env.PAGE_SIZE || 3 } = pagination
			const paginationParams = `page=${pageIndex}&pageSize=${pageSize}`
			url = appendParams(url, paginationParams)
		}
		if (sorting && Object.keys(sorting).length > 0) {
			const sortingParams = Object.keys(sorting)
				.filter((s) => sorting[s])
				.map((s) => {
					return `sort=${s}:${String(sorting[s]).toUpperCase()}`
				})
				.join('&')

			url = appendParams(url, sortingParams)
		}
		/*
		VOLCANIC BACKEND

		FILTERS:
		null, notNull,
		in, nin,
		likei, containsi, ncontainsi, startsi, endsi, eqi, neqi,
		like, contains, ncontains, starts, ends, eq, neq,
		gt, ge, lt, le, between,
		
		----

		field:operatore=valore 

		----
		
		EXAMPLES:

		&name:eq=Pippo
		&name:starts=Pip
		&name:startsi=piP
		&kmMax:between=100,150
		&kmMax:in=100,120,190,500
		&engine:like=el%ric
		&customer.lastName:null=false
		&customer.firstName:notNull:true
		&customer.firstName:contains:am
		&customer.firstName:containsi:AM
		*/
		if (filters && Object.keys(filters).length > 0) {
			const groupedByKey = _.groupBy(filters, (v) => {
				return v.key
			})

			const filteringParams = Object.keys(groupedByKey)
				.map((k) => {
					const filter = groupedByKey[k]
					return `${k}:${filter[0].operator || ''}=${filter.map((f) => f.value).join(',')}`
				})
				.join('&')

			url = appendParams(url, filteringParams)
		}
		return encodeURI(url)
	}
} as Api

export default ApiConfiguration
