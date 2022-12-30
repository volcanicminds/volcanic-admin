type Menu = Array<MenuItem>

interface MenuItem {
	label: LocalizedItemField
	name: string | null
	source: string | null
	icon?: string
	isDefault?: boolean
	filters?: TableFiltersParams
	sorting?: TableSortingParams
	pagination?: TablePaginationParams
	operation?: (value: any) => void
}
