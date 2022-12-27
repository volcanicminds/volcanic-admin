<!-- eslint-disable vue/attribute-hyphenation -->
<template>
	<Fragment>
		<TableHeader :source="routeSource" />
		<p v-if="tableTotalLength === 0">{{ $t('table.missingData', { routeSource }) }}</p>

		<ve-table
			:event-custom-option="eventCustomOption"
			:fixed-header="true"
			:columns="columnDefs"
			:columnHiddenOption="columnHiddenOption"
			:table-data="table || []"
			:sort-option="sortOption"
		/>
		<ve-pagination
			class="w100 mx-0"
			:total="tableTotalLength"
			:page-size="params.pagination?.pageSize"
			:page-size-option="[defaultPageSize, defaultPageSize * 2, defaultPageSize * 4]"
			:page-index="params.pagination?.pageIndex"
			@on-page-number-change="pageNumberChange"
			@on-page-size-change="pageSizeChange"
		/>
	</Fragment>
</template>

<script lang="tsx">
import Vue, { defineComponent } from 'vue'
import dayjs from 'dayjs'
import _ from 'lodash'
import * as api from '@/utils/apiInternalInterface'
import TableFilter from '@/components/default/table-filter.vue'
import TableHeader from '@/components/structural/table/table-header.vue'
import TableOptionsMenu from '@/components/structural/table/table-options-menu.vue'
import { useTablesStore } from '@/stores/tables'
import { useConfigurationStore } from '@/stores/configuration'
import { DEFAULT_PAGE_SIZE, START_PAGE_INDEX } from '@/utils/constants'
import {
	deleteFilterDuplicates,
	prepareModelParamenters,
	FILTER_OPERATORS,
	FILTER_URL_PREFIX,
	SORT_URL_PREFIX,
	PAGINATION_URL_PREFIX,
	extendSorting,
	extendSingleSortKey
} from '@/utils/table'
import { getTranslatedItem } from '@/utils/locale'

export default defineComponent({
	components: { TableHeader },
	data() {
		return {
			table: [] as TableData,
			tableTotalLength: 0,
			columnDefs: [] as ColumnArrayDefinition,
			columnHiddenOption: {
				// default hidden column keys
				defaultHiddenColumnKeys: [] as DefaultHiddenColumnKeys
			},
			model: {} as ConfigSourceModelColumns,
			routeSource: '',
			source: '',
			params: {
				sorting: {},
				filters: [],
				pagination: {
					pageIndex: START_PAGE_INDEX,
					pageSize: DEFAULT_PAGE_SIZE
				}
			} as TableRoutingParams,
			defaultPageSize: DEFAULT_PAGE_SIZE,
			sortOption: {
				sortChange: this.sortChange,
				multipleSort: true
			},
			loader: { show: () => null, close: () => null },
			eventCustomOption: {
				bodyRowEvents: ({ row, rowIndex }: any) => {
					return {
						click: (event: any) => this.$router.push({ name: 'detail', params: this.getDetailParams(row) })
					}
				}
			}
		}
	},

	watch: {
		$route(to, from) {
			this.initialize()
		}
	},

	async mounted() {
		this.loader = this.$veLoading({
			target: '#table-container',
			name: 'grid',
			tip: 'Sto caricando...'
		})
		this.initialize()
	},

	methods: {
		initialize: async function () {
			const tableStore = useTablesStore()
			const configStore = useConfigurationStore()

			const path = this.$route.path.replace('/', '')
			const menu = configStore.menu || []
			const menuItem = menu.find((m) => {
				return m.name === path
			})

			const indexSource = menuItem?.source
			if (!menuItem || !indexSource) {
				Vue.$toast.open({
					message: this.$t('toasts.wrongMenu'),
					type: 'warning',
					position: 'bottom'
				})
				return
			}

			this.routeSource = indexSource

			this.loader.show()

			const modelConfiguration = configStore.sources[this.routeSource]
			if (!modelConfiguration) {
				console.warn('Configuration model missing')
			}

			this.model = modelConfiguration?.columns
			this.source = `/${menuItem.source}`

			let paramsHaveChange = false

			const tableStoreConfiguration = tableStore.tables.configuration[menuItem.name || indexSource]
			if (tableStoreConfiguration) {
				paramsHaveChange = !_.isEqual(this.params, tableStoreConfiguration)
				this.params = tableStoreConfiguration
			} else {
				const updatedParams = this.getParams({ menu: menuItem, configuration: modelConfiguration })

				paramsHaveChange = !_.isEqual(this.params, updatedParams)
				this.params = updatedParams
				this.updateStoreConfiguration()
			}

			if (paramsHaveChange) {
				this.updateRouteQuery()

				try {
					await this.find()
				} catch (e) {
					console.error(e)
				}

				this.updateTable({ menu: menuItem, configuration: modelConfiguration, indexSource })
			}

			this.loader.close()
		},
		updateTable: function ({
			menu,
			indexSource,
			configuration
		}: {
			menu: MenuItem
			indexSource: string
			configuration: ConfigSourceModel
		}) {
			const tableStore = useTablesStore()
			const isConfigured = this.model != null
			const hasTableData = this.table.length > 0
			const storedColumnDefinitions = tableStore.tables.columnDefinitions[menu.name || indexSource]

			if (storedColumnDefinitions) {
				this.columnDefs = storedColumnDefinitions
			} else if (isConfigured || hasTableData) {
				this.setColumnDefinition({ isConfigured, configuration, indexSource })
			}
		},
		setColumnDefinition: function ({
			isConfigured,
			configuration,
			indexSource
		}: {
			isConfigured: boolean
			configuration: ConfigSourceModel
			indexSource: string
		}) {
			const sourceOfTableData = isConfigured ? this.model : this.table
			this.columnDefs = Object.keys(sourceOfTableData).map((key, index) => {
				const rowModel = this.model[key] || {}
				const title = getTranslatedItem(this.model[key].input.label) || key.toUpperCase()
				const sortBy = this.params.sorting ? this.params.sorting[extendSingleSortKey(key, rowModel)] : undefined

				return {
					field: key,
					title,
					key,
					width: rowModel?.table?.width,
					sortBy,
					//align left hides the filter button
					//align: typeof sourceOfTableData[key] === 'number' ? 'right' : 'left',
					renderBodyCell: ({ row, column, rowIndex }: { row: any; column: any; rowIndex: number }, h: any) => {
						const value = row[column.field]
						let normalizedValue = value
						const cellFormat = rowModel?.table?.cell?.format
						const formatType = typeof cellFormat

						if (typeof value === 'boolean') {
							normalizedValue = value === true ? 'Sì' : 'No'
						} else if (formatType === 'string') {
							normalizedValue = dayjs(value).format(cellFormat)
						} else if (formatType === 'function') {
							normalizedValue = cellFormat(value)
						}

						const isLink = rowModel?.table?.cell?.isLink

						if (isLink) {
							return (
								<router-link
									title={`${this.model[column.field]?.input.label}`}
									to={`${this.model[column.field]?.input.source}/${value?.id}`}
								>
									<a onClick={(e) => e.stopPropagation()}>{normalizedValue}</a>
								</router-link>
							)
						}

						return <span>{normalizedValue}</span>
					},
					filterCustom: {
						defaultVisible: false,
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
						render: ({ showFn, closeFn }: { showFn: () => void; closeFn: () => void }, h: any) => {
							const filterModel = rowModel?.table?.filtering || ({} as TableFiltering)
							const paramsFilters = this.params?.filters || []
							const filterDefaultValues = paramsFilters.filter((f) => f.key === key).map((f) => f.value)
							return filterModel?.enabled !== false ? (
								<TableFilter
									inputType={rowModel?.type || 'text'}
									name={key}
									subField={filterModel?.subField}
									operator={filterModel.operator || 'eq'}
									values={filterDefaultValues || []}
									addFilter={this.addFilter}
									searchCancel={() => this.searchCancel(closeFn)}
									searchConfirm={() => this.searchConfirm(closeFn)}
								/>
							) : null
						}
					}
				}
			})

			if (configuration?.table?.rowMenu) {
				const menu = (configuration?.table?.rowMenu || []) as TableOptionsMenuItems

				//Setting the standard operation on case of delete
				menu.forEach((m, index) => {
					if (m.delete) {
						menu[index].operation = this.deleteRow
					}
				})

				this.columnDefs.push({
					field: '',
					title: '',
					key: 'row-menu',
					renderBodyCell: ({ row, column, rowIndex }: { row: any; column: any; rowIndex: number }, h: any) => {
						return <TableOptionsMenu row={row} column={column} rowMenu={menu} />
					}
				})
			}

			Object.keys(sourceOfTableData).forEach((key) => {
				if (this.model[key]?.table?.visible === false) {
					this.columnHiddenOption.defaultHiddenColumnKeys.push(key)
				}
			})

			const tableStore = useTablesStore()
			tableStore.setColumnDefinition(indexSource, this.columnDefs)
		},
		getParams: function ({ menu, configuration }: { menu: MenuItem; configuration: ConfigSourceModel }) {
			const getModelParameters = prepareModelParamenters(this.model)
			const urlParams = this.$route.query
			const urlPagination = {} as TablePaginationParams
			const urlFilters = [] as TableFiltersParams
			const urlSorting = {} as TableSortingParams

			Object.keys(urlParams).forEach((k) => {
				if (k.startsWith(FILTER_URL_PREFIX)) {
					const normalizedK = k.replace(FILTER_URL_PREFIX, '')
					const [key, operator = FILTER_OPERATORS.EQ, index] = normalizedK.split(':')
					urlFilters.push({
						key,
						operator,
						value: urlParams[k]
					})
				}
				if (k.startsWith(SORT_URL_PREFIX)) {
					const normalizedK = k.replace(SORT_URL_PREFIX, '')
					urlSorting[normalizedK] = urlParams[k] === 'no' ? '' : urlParams[k]
				}
				if (k.startsWith(PAGINATION_URL_PREFIX)) {
					const normalizedK = k.replace(PAGINATION_URL_PREFIX, '')
					urlPagination[normalizedK] = Number(urlParams[k])
				}
			})

			const { pagination: menuPagination = {}, sorting: menuSorting = {}, filters: menuFilters = [] } = menu
			const modelPagination = configuration?.table?.pagination || {}

			return {
				pagination: {
					...{ pageSize: this.params.pagination?.pageSize, pageIndex: this.params.pagination?.pageIndex },
					...modelPagination,
					...menuPagination,
					...urlPagination
				},
				filters: deleteFilterDuplicates([
					...(getModelParameters('filters') as TableFiltersParams),
					...menuFilters,
					...urlFilters
				]),
				sorting: { ...(getModelParameters('sorting') as TableSortingParams), ...menuSorting, ...urlSorting }
			}
		},
		getDetailParams: function (row: any) {
			return {
				source: this.routeSource,
				id: row.id
			}
		},
		updateStoreConfiguration: function () {
			const tableStore = useTablesStore()
			const indexSource = this.$route.params?.source
			tableStore.setTableConfiguration(indexSource, this.params)
		},
		find: async function () {
			const [tableData, tableCount] = await Promise.all([
				api.find(this.source, this.params),
				api.count(this.source, {
					filters: this.params?.filters,
					sorting: {},
					pagination: {}
				})
			])

			this.table = tableData as TableData
			this.tableTotalLength = tableCount as number
		},
		updateRouteQuery: function () {
			const pagination = {
				[`${PAGINATION_URL_PREFIX}pageIndex`]: String(this.params.pagination?.pageIndex),
				[`${PAGINATION_URL_PREFIX}pageSize`]: String(this.params.pagination?.pageSize)
			}

			const sorting = {} as TableSortingParams
			Object.keys(this.params.sorting).forEach((k) => {
				if (this.params.sorting[k] === '') {
					sorting[`${SORT_URL_PREFIX}${k}`] = 'no'
				}
				if (this.params.sorting[k]) {
					sorting[`${SORT_URL_PREFIX}${k}`] = String(this.params.sorting[k])
				}
			})

			const filters = {} as { [key: string]: ApiGenericValue }
			this.params.filters?.forEach((filter, index) => {
				if (filter) {
					filters[`${FILTER_URL_PREFIX}${filter.key}:${filter.operator}:${index}`] = String(filter.value)
				}
			})

			const query = {
				...pagination,
				...sorting,
				...filters
			}
			if (!_.isEqual(this.$route.query, query)) {
				this.$router.replace({
					...this.$router.currentRoute,
					query
				})
			}
		},
		pageNumberChange(pageIndex: number) {
			const loader = this.loader
			loader.show()

			this.params = {
				...this.params,
				pagination: {
					pageSize: this.params?.pagination?.pageSize,
					//Subtracting 1 because of the table lib needs
					pageIndex: pageIndex - 1
				}
			}
			this.updateStoreConfiguration()

			this.updateRouteQuery()

			this.find().finally(loader.close())
		},
		pageSizeChange(pageSize: number) {
			const loader = this.loader
			loader.show()

			this.params = {
				...this.params,
				pagination: {
					pageSize,
					pageIndex: this.params.pagination?.pageIndex
				}
			}
			this.updateStoreConfiguration()

			this.updateRouteQuery()

			this.find().finally(loader.close())
		},
		sortChange(sorting: SortParams) {
			const loader = this.loader
			loader.show()
			const extendedSorting = extendSorting(sorting, this.model)

			this.params = {
				...this.params,
				sorting: extendedSorting
			}
			this.updateStoreConfiguration()

			this.updateRouteQuery()

			this.find().finally(loader.close())
		},
		addFilter(key: string, operator: string, values: Array<ApiGenericValue>) {
			if (!this.params?.filters) {
				this.params.filters = [] as TableFiltersParams
			}
			const restOfTheFilters = this.params.filters.filter((f) => f.key !== key)
			const newFilterValues = values.filter((v) => !!v).map((v) => ({ key, operator, value: v }))

			this.params.filters = [...restOfTheFilters, ...newFilterValues]
		},
		filterChange() {
			const loader = this.loader
			loader.show()

			const filters = Array.from(this.params.filters || [])
			this.params.filters?.forEach((filter: any, index: number) => {
				if (!filter.value) {
					delete filters[index]
				}
			})

			this.params = {
				...this.params,
				filters
			}
			this.updateStoreConfiguration()

			this.updateRouteQuery()

			loader.show()
			this.find().finally(loader.close())
		},
		searchCancel(closeFn: () => void) {
			closeFn()
		},
		searchConfirm(closeFn: () => void) {
			this.filterChange()
			closeFn()
		},
		deleteRow: async function (row: any) {
			const id = row?.id
			if (id) {
				await api.del(this.source, id)

				//refresh
				this.find()
			} else {
				console.warn('Cannot delete, no id found')
				Vue.$toast.open({
					message: this.$t('toasts.cannotDelete'),
					type: 'error',
					position: 'bottom'
				})
			}
		}
	}
})
</script>
<style stylus>
.ve-table-body-tr:hover {
	cursor: pointer;
}
</style>
