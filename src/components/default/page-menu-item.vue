<template>
	<v-list-item link>
		<v-list-item-icon>
			<v-icon large>{{ item.icon }}</v-icon>
		</v-list-item-icon>

		<v-list-item-content>
			<v-list-item-title>{{ translateLabel(item.label) }}</v-list-item-title>
		</v-list-item-content>
	</v-list-item>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { getLocaleLanguage } from '@/utils/locale'

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
	},
	methods: {
		translateLabel: function (label: MenuItemLabel) {
			if (typeof label === 'string') {
				return label
			}

			const locale = getLocaleLanguage()
			return label[locale]
		}
	}
})
</script>
