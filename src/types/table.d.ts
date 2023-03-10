type RowId = string | number
interface Row {
	id: RowId
	[field: string]: any
}
interface Table {
	[key: string]: Array<Row>
}

type TableData = Array<Row>
interface Tables {
	columnDefinitions: { [source: string]: ColumnArrayDefinition }
	configuration: {
		[source: string]: TableRoutingParams
	}
}

type ColumnFilterName = {
	value: number
	label: string
	selected: boolean
}
type ColumnFilterList = Array<ColumnFilterName>
type ColumnFilter = {
	filterList: ColumnFilterList
	filterConfirm: (filterLis: ColumnFilterList) => void
	filterReset: (filterList: ColumnFilterList) => void
	isMultiple?: boolean
	filterIcon?: () => void
	maxHeight?: number
}
type ColumnCustomFilter = {
	render: ({ showFn, closeFn }, h) => any
	defaultVisible?: boolean
	filterIcon?: () => void
}
type ColumnArrayDefinition = Array<ColumnDefinition>

type ColumnRendereBodyCellArgs = { row: any; column: any; rowIndex: number }

type ColumnRenderBodyCell = (args: ColumnRendereBodyCellArgs) => JSX.Element

type ColumnDefinition = {
	field: string
	key: string
	title: string
	type?: string
	align?: string
	width?: string | number
	filter?: ColumnFilter
	filterCustom?: ColumnCustomFilter
	sortBy?: renderBodyCell | undefined
	renderBodyCell?: ColumnRenderBodyCell
}

type DefaultHiddenColumnKeys = Array<string>
interface SortParams {
	[key: string]: 'asc' | 'desc' | ''
}

type TableSortingParams = ApiGetSort
type TablePaginationParams = ApiGetPagination
type TableFiltersParams = Array<{
	key: string
	operator: string
	value: ApiGenericValue
}>

interface TableRoutingParams {
	filters: TableFiltersParams
	sorting: TableSortingParams
	pagination: TablePaginationParams
}

type TableOptionsMenuItem = {
	title: LocalizedItemField
	requiresConfirmation: boolean
	delete?: boolean
	operation?: (value: any) => void
}

type TableOptionsMenuItems = Array<TableOptionsMenuItem>
