type Menu = Array<MenuItem>
interface MenuItem {
	label: string
	name: string | null
	source: string | null
	icon?: string
	isDefault?: boolean
	filters?: TableFiltersParams
	sorting?: TableSortingParams
	pagination?: TablePaginationParams
	operation?: () => void
}
