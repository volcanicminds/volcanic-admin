<template>
	<v-menu transition="scale-transition">
		<template #activator="{ on, attrs }">
			<v-btn color="primary" icon v-bind="attrs" v-on="on"><v-icon> more_vert </v-icon></v-btn>
		</template>
		<v-list>
			<v-list-item v-for="(item, index) in menu" :key="index" @click="(e) => onClick(e, item)">
				<v-list-item-title class="table-row-menu-list-item">{{ item.title }}</v-list-item-title>
			</v-list-item>
		</v-list>
	</v-menu>
</template>
<script setup lang="ts">
import { defineProps, toRef } from 'vue'

interface TableOptionsMenuProps {
	rowMenu: TableOptionsMenuItems
	row?: {
		value: any
	}
	column?: any
}

const props = defineProps<TableOptionsMenuProps>()

const menu = toRef(props, 'rowMenu')
const row = toRef(props, 'row')

function onClick(e: any, item: any) {
	// e.stopPropagation()

	if (item.requiresConfirmation) {
		const confirmed = window.confirm(`Vuoi veramente cancellare la riga ${this.row?.id}?`)

		if (confirmed) {
			item.operation(row)
		}
	}
}
</script>
<style stylus>
.table-row-menu-list-item:hover {
	cursor: pointer;
}
</style>
