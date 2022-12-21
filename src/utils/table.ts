import { DEFAULT_RELATION_SEPARATOR } from './rest'

export const FILTER_OPERATORS = {
	BETWEEN: 'between',
	IN: 'in',
	NIN: 'nin',
	EQ: 'eq',
	NEQ: 'neq',
	EQI: 'eqi',
	NEQI: 'neqi',
	GT: 'gt',
	GE: 'ge',
	LT: 'lt',
	LE: 'le',
	STARTS: 'starts',
	ENDS: 'ends',
	STARTSI: 'startsi',
	ENDSI: 'endsi',
	LIKE: 'like',
	CONTAINS: 'contains',
	NCONTAINS: 'ncontains',
	LIKEI: 'likei',
	CONTAINSI: 'containsi',
	NCONTAINSI: 'ncontainsi',
	NULL: 'null',
	NOTNULL: 'notNull'
}

export const FILTER_URL_PREFIX = 'filter:'
export const SORT_URL_PREFIX = 'sort:'
export const PAGINATION_URL_PREFIX = 'pagination:'

export function deleteFilterDuplicates(filters: TableFiltersParams = []) {
	const filtersWithNoDuplicates = [] as TableFiltersParams

	filters.forEach((f) => {
		const i = filtersWithNoDuplicates.findIndex((f_unique) => {
			return f_unique.key === f.key && f_unique.operator === f.operator && f_unique.value === f.value
		})

		if (i === -1) {
			filtersWithNoDuplicates.push(f)
		}
	})

	return filtersWithNoDuplicates
}

export function extendSingleSortKey(s: string, model: FieldModel) {
	const subField = model.table?.sorting?.subField
	if (subField) {
		return `${s}${DEFAULT_RELATION_SEPARATOR}${subField}`
	}

	return s
}

export function extendSorting(sorting: SortParams, model: ConfigSourceModelColumns) {
	const extendedSorting = {} as SortParams
	Object.keys(sorting).forEach((s) => {
		extendedSorting[extendSingleSortKey(s, model[s])] = sorting[s]
	})

	return extendedSorting
}

export function getColumnSorting(rowModel: FieldModel) {
	if (!rowModel) {
		return undefined
	}
	return rowModel?.table?.sorting?.enabled !== false ? rowModel?.table?.sorting?.default || '' : undefined
}

export function getColumnFiltering(rowModel: FieldModel) {
	const filtering = rowModel?.table?.filtering
	if (!rowModel || !filtering?.enabled) {
		return {}
	}
	return { filter: filtering.defaultValues, operator: filtering?.operator }
}

export function prepareModelParamenters(model: ConfigSourceModelColumns = {}) {
	const modelFilters = [] as TableFiltersParams
	const modelSorting = {} as TableSortingParams
	const modelPagination = {} as TablePaginationParams

	Object.keys(model).forEach((k: string) => {
		const modelField = model[k]
		const sorting = getColumnSorting(modelField)
		if (sorting != null) {
			modelSorting[extendSingleSortKey(k, modelField)] = sorting
		}
		const { filter, operator } = getColumnFiltering(modelField)
		if (operator || filter) {
			filter?.forEach((f) => {
				modelFilters.push({ key: k, operator: operator || FILTER_OPERATORS.EQ, value: f })
			})
		}
	})
	return function (type: 'filters' | 'sorting' | 'pagination') {
		switch (type) {
			case 'filters':
				return modelFilters
			case 'sorting':
				return modelSorting
			case 'pagination':
				return modelPagination
			default:
				return {}
		}
	}
}
