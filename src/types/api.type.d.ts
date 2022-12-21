/* eslint-disable @typescript-eslint/no-explicit-any */

interface User {
	[field: string]: any
}
interface ApiBody {
	[field: string]: any
}

type ApiRequestBody = ApiBody
type ApiResponseBody = number | ApiBody | Array<ApiBody>
type ApiGenericValue = string | number | boolean

interface ApiGenericParams {
	[field: string]: ApiGenericValue
}
type ApiGetFilter = ApiGenericParams
type ApiGetSort = ApiGenericParams
type ApiGetPagination = {
	pageIndex?: number
	pageSize?: number
}

interface ApiGetParams {
	filters?: ApiGetFilter
	sorting?: ApiGetSort
	pagination?: ApiGetPagination
}
