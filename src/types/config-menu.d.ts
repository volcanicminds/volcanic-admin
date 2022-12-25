type Menu = Array<MenuItem>

type MenuItemLabel = string | LocaleLabel

interface MenuItem {
	label: MenuItemLabel
	name: string | null
	source: string | null
	icon?: string
	isDefault?: boolean
	filters?: TableFiltersParams
	sorting?: TableSortingParams
	pagination?: TablePaginationParams
	operation?: () => void
}
