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
<script lang="ts">
import { defineComponent } from 'vue'
import { getTranslatedItem } from '@/utils/locale'

export default defineComponent({
	props: {
		rowMenu: {
			type: Array,
			default() {
				return [] as unknown
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
	},
	methods: {
		onClick: function (e: any, item: any) {
			// e.stopPropagation()

			if (item.requiresConfirmation) {
				const confirmed = window.confirm(this.$t('table.confirmDeleteRow', { rowId: this.row?.id }))

				if (confirmed) {
					item.operation(this.row)
				}
			}
		},
		translateLabel: function (label: LocalizedItemField) {
			return getTranslatedItem(label)
		}
	}
})
</script>
<style stylus>
.table-row-menu-list-item:hover {
	cursor: pointer;
}
</style>
