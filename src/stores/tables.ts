import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTablesStore = defineStore('table', () => {
	const tables = ref({ columnDefinitions: {}, configuration: {} } as Tables)

	function setColumnDefinition(source: string, definition: ColumnArrayDefinition) {
		tables.value.columnDefinitions[source] = definition
	}

	function updateColumnDefinition(source: string, field: string, attribute: string, value: any) {
		const fieldIndex = tables.value.columnDefinitions[source].findIndex((c) => {
			return c.field === field
		})
		if (fieldIndex > -1) {
			tables.value.columnDefinitions[source][fieldIndex][attribute] = value
		}
	}

	function setTableConfiguration(source: string, configuration: TableRoutingParams) {
		tables.value.configuration[source] = configuration
	}

	return {
		tables,
		setColumnDefinition,
		updateColumnDefinition,
		setTableConfiguration
	}
})
