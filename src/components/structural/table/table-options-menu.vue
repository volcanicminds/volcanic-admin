<template>
	<v-menu transition="scale-transition">
		<template #activator="{ on, attrs }">
			<v-btn icon v-bind="attrs" v-on="on"><v-icon> more_vert </v-icon></v-btn>
		</template>
		<v-list>
			<v-list-item v-for="(item, index) in rowMenu" :key="index" @click="(e) => onClick(e, item)">
				<v-list-item-title class="table-row-menu-list-item">{{ translateLabel(item.title) }}</v-list-item-title>
			</v-list-item>
		</v-list>
	</v-menu>
</template>
<script setup lang="ts">
import { getTranslatedItem } from '@/utils/locale'
import { getIdField } from '@/utils/model'
import i18n from '@/locale/i18n'

const props = defineProps({
	rowMenu: {
		type: Array,
		default() {
			return []
		},
		required: true
	},
	row: {
		type: Object,
		default: null,
		required: false
	},
	columns: {
		type: Object,
		default: null,
		required: false
	}
})

function onClick(e: any, item: any) {
	// e.stopPropagation()
	if (item.requiresConfirmation) {
		const idField = getIdField(props.columns)
		let translatedMessage = i18n.t('table.confirmDeleteRow', { rowId: (props.row || {})[idField] })
		if (typeof translatedMessage === 'object') {
			//TODO: to deeply understand how to manage this case
			translatedMessage = JSON.stringify(translatedMessage)
		}
		const confirmed = window.confirm(translatedMessage)

		if (confirmed) {
			item.operation(props.row)
		}
	}
}
function translateLabel(label: LocalizedItemField) {
	return getTranslatedItem(label)
}
</script>
<style stylus>
.table-row-menu-list-item:hover {
	cursor: pointer;
}
</style>
