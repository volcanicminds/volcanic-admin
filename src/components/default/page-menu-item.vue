<template>
	<v-list-item link>
		<v-list-item-icon>
			<v-icon large>{{ item.icon }}</v-icon>
		</v-list-item-icon>

		<v-list-item-content>
			<v-list-item-title>{{ item.label }}</v-list-item-title>
		</v-list-item-content>
	</v-list-item>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
	name: 'PageMenuItem',
	props: {
		item: {
			type: Object,
			default() {
				return {}
			},
			required: true
		}
	}
})
</script>
