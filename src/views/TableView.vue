<!-- eslint-disable vue/attribute-hyphenation -->
<template>
	<Fragment>
		<TableHeader
			:source="routeSource || ''"
			:deleteAll="deleteAll"
			:options="model?.table?.options"
			:has-selected-rows="checkboxOption.selectedRowKeys?.length > 0"
		/>
		<p v-if="tableTotalLength === 0">{{ $t('table.missingData', { routeSource }) }}</p>
		<div class="d-none d-sm-block">
			<ve-table
				:event-custom-option="eventCustomOption"
				:fixed-header="true"
				:columns="columnDefs"
				:columnHiddenOption="columnHiddenOption"
				:table-data="table || []"
				:sort-option="sortOption"
				row-key-field-name="rowKey"
				:checkbox-option="checkboxOption"
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
		</div>
		<div class="d-sm-none">
			<v-card v-for="(row, rIndex) in table" :key="rIndex" tile class="mx-auto my-1" @click="goToDetail(row)">
				<v-list dense>
					<v-list-item-group v-for="(col, cIndex) in columnDefs" :key="cIndex">
						<v-list-item
							v-if="col.field && !columnHiddenOption.defaultHiddenColumnKeys.includes(col.key)"
							:inactive="true"
						>
							<v-list-item-content>
								<v-list-item-title>{{ col.title }}</v-list-item-title>
								{{ row[col.key] }}
							</v-list-item-content>
						</v-list-item>
					</v-list-item-group>
				</v-list>
			</v-card>
			<v-pagination
				v-model="mobileCurrentPage"
				:length="Math.ceil(tableTotalLength / (params.pagination?.pageSize || 1))"
			></v-pagination>
		</div>
	</Fragment>
</template>

<script lang="tsx">
import Vue, { computed, defineComponent, ref, watch } from 'vue'
import router from '@/router'
import type { Route } from 'vue-router'
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
import { getIdField } from '@/utils/model'
import { storeToRefs } from 'pinia'

export default defineComponent({
	components: { TableHeader },
	setup() {
		function getCurrentPath() {
			const route = router.currentRoute as Route
			return route.path.replace('/', '')
		}
		const currentPath = ref(getCurrentPath())

		const defaulConfigMenu = { source: currentPath.value, label: '', name: null }
		const model = ref(null as ConfigSourceModel | null)
		const configMenu = ref(defaulConfigMenu as MenuItem)
		const routeSource = ref(null as string | null | undefined)

		const configStore = useConfigurationStore()
		const { menu, sources } = storeToRefs(configStore)
		function setupConfigMenu(value: Menu) {
			const menuItem = (value || []).find((m) => {
				return m.name === currentPath.value
			})
			configMenu.value = menuItem || defaulConfigMenu
		}
		function setupModelAndRouteSource(sources: StoreSource) {
			const indexSource = configMenu.value?.source
			routeSource.value = indexSource
			model.value = indexSource ? (sources || {})[indexSource] : null
		}
		function refreshRoute() {
			currentPath.value = getCurrentPath()
		}

		if (menu) {
			setupConfigMenu(menu.value)
		}
		if (sources) {
			setupModelAndRouteSource(sources.value)
		}

		watch(menu, (newMenu) => {
			setupConfigMenu(newMenu)
		})
		watch(sources, (newSources) => {
			setupModelAndRouteSource(newSources)
		})
		watch(currentPath, () => {
			setupConfigMenu(menu.value)
			setupModelAndRouteSource(sources.value)
		})

		return {
			model,
			configMenu,
			routeSource,
			refreshRoute
		}
	},
	data() {
		return {
			idField: '',
			table: [] as TableData,
			tableTotalLength: 1,
			columnDefs: [] as ColumnArrayDefinition,
			columnHiddenOption: {
				// default hidden column keys
				defaultHiddenColumnKeys: [] as DefaultHiddenColumnKeys
			},
			mobileCurrentPage: 1,
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
						click: (event: any) => {
							if (event.target.type !== 'checkbox') {
								this.goToDetail(row)
							}
						}
					}
				}
			},
			checkboxOption: {
				selectedRowKeys: [] as Array<number>,
				selectedRowChange: ({
					row,
					isSelected,
					selectedRowKeys
				}: {
					row: any
					isSelected: boolean
					selectedRowKeys: Array<number>
				}) => {
					this.changeSelectedRowKeys(selectedRowKeys)
				},
				selectedAllChange: ({
					isSelected,
					selectedRowKeys
				}: {
					isSelected: boolean
					selectedRowKeys: Array<number>
				}) => {
					this.changeSelectedRowKeys(selectedRowKeys)
				}
			}
		}
	},

	watch: {
		$route(to, from) {
			if (to !== from) {
				this.refreshRoute()
			}
		},
		mobileCurrentPage(pageIndex: number) {
			this.pageNumberChange(pageIndex)
		},
		model(newValue, oldValue) {
			if (!_.isEqual(newValue, oldValue)) {
				this.initialize()
			}
		},
		configMenu(newValue, oldValue) {
			if (!_.isEqual(newValue, oldValue)) {
				this.initialize()
			}
		}
	},

	async mounted() {
		this.loader = this.$veLoading({
			target: '#table-container',
			name: 'grid',
			tip: this.$t('table.loading')
		})
		this.initialize()
	},

	methods: {
		initialize: async function () {
			this.loader.show()
			this.idField = getIdField(this.model?.columns || {})
			if (!this.configMenu || !this.routeSource) {
				// Vue.$toast.open({
				// 	message: this.$t('toasts.wrongMenu'),
				// 	type: 'warning',
				// 	position: 'bottom'
				// })
				this.loader.close()
				return
			}
			this.source = `/${this.configMenu.source}`

			let paramsHaveChange = false

			const tableStore = useTablesStore()
			const tableStoreConfiguration = tableStore.tables.configuration[this.configMenu.name || this.routeSource]
			if (tableStoreConfiguration) {
				paramsHaveChange = !_.isEqual(this.params, tableStoreConfiguration)
				this.params = tableStoreConfiguration
			} else {
				const updatedParams = this.getParams({ menu: this.configMenu })

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

				this.updateTable()
			}
			this.loader.close()
		},
		updateTable: function () {
			const tableStore = useTablesStore()
			const isConfigured = this.model?.columns != null
			const hasTableData = this.table.length > 0
			const storedColumnDefinitions = tableStore.tables.columnDefinitions[this.configMenu?.name || this.routeSource]

			if (storedColumnDefinitions) {
				this.columnDefs = storedColumnDefinitions
			} else if (isConfigured || hasTableData) {
				this.setColumnDefinition(isConfigured)
			}
		},
		setColumnDefinition: function (isConfigured: boolean) {
			let sourceOfTableData = {}
			if (isConfigured) {
				sourceOfTableData = this.model.columns
			} else if (this.table && this.table.length > 0) {
				sourceOfTableData = this.table[0]
			}

			this.columnDefs = Object.keys(sourceOfTableData).map((key) => {
				let rowModel = null
				let title = key.toUpperCase()
				let sortBy = undefined
				if (isConfigured) {
					rowModel = this.model.columns[key]
					title = `${getTranslatedItem(this.model.columns[key].input.label || '')}`
					sortBy = this.params.sorting ? this.params.sorting[extendSingleSortKey(key, rowModel)] : undefined
				}

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
						const modelColumns = this.model?.columns || {}

						if (isLink) {
							return (
								<router-link
									title={`${modelColumns[column.field]?.input.label}`}
									to={`${modelColumns[column.field]?.input.source}/${(value || {})[this.idField]}`}
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
									values={(filterDefaultValues || []) as any} //TODO: understand how to remove this any
									addFilter={this.addFilter}
									searchCancel={() => this.searchCancel(closeFn)}
									searchConfirm={() => this.searchConfirm(closeFn)}
								/>
							) : null
						}
					}
				}
			})

			if (this.model?.table?.customColumns && this.model?.table?.customColumns.length > 0) {
				this.model.table?.customColumns.forEach((col: ConfigSourceCustomColumn) => {
					this.columnDefs.splice(col.position, 0, {
						field: '',
						key: `custom-column-${col.position}`,
						title: `${getTranslatedItem(col.title || {}) || ''}`,
						align: col.align || 'center',
						renderBodyCell: ({ row, column, rowIndex }: { row: any; column: any; rowIndex: number }, h: any) => {
							return col.customComponent({
								row,
								model: this.model
							})
						}
					})
				})
			}

			if (this.model?.table?.options?.checkbox) {
				this.columnDefs.unshift({
					field: '',
					key: 'checkbox',
					type: 'checkbox',
					title: '',
					width: 50,
					align: 'center'
				})
			}

			if (this.model?.table?.rowMenu) {
				const menu = (this.model?.table?.rowMenu || []) as TableOptionsMenuItems

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
						return <TableOptionsMenu row={row} columns={this.model.columns} rowMenu={menu} />
					}
				})
			}

			Object.keys(sourceOfTableData).forEach((key) => {
				if (this.model?.columns[key]?.table?.visible === false) {
					this.columnHiddenOption.defaultHiddenColumnKeys.push(key)
				}
			})

			const tableStore = useTablesStore()
			tableStore.setColumnDefinition(this.routeSource, this.columnDefs)
		},
		changeSelectedRowKeys(keys: Array<number>) {
			this.checkboxOption.selectedRowKeys = keys
		},
		selectedAll() {
			this.checkboxOption.selectedRowKeys = this.table.map((x) => x.rowKey)
		},
		unselectedAll() {
			this.checkboxOption.selectedRowKeys = []
		},
		getParams: function ({ menu }: { menu: MenuItem }) {
			const getModelParameters = prepareModelParamenters(this.model?.columns || {})
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
			const modelPagination = this.model?.table?.pagination || {}

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
				id: row[this.idField]
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

			this.table = (tableData as TableData).map((t, i) => ({ rowKey: i, ...t }))
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
					pageIndex
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
			const extendedSorting = extendSorting(sorting, this.model?.columns || {})

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
			const id = (row || {})[this.idField]
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
		},
		deleteAll: async function () {
			const rows = this.table.filter((t) => this.checkboxOption.selectedRowKeys.includes(t.rowKey)) || []
			await api.deleteMultiple(
				this.source,
				rows.map((r: Row) => `${r[this.idField]}`)
			)

			//refresh
			this.find()
			this.unselectedAll()
		},
		goToDetail: function (row: Row) {
			this.$router.push({ name: 'detail', params: this.getDetailParams(row) })
		}
	}
})
</script>
<style stylus>
.ve-table-body-tr:hover {
	cursor: pointer;
}
.ve-table-fixed-header {
	position: sticky;
}
</style>
