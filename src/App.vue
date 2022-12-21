<template>
	<v-app>
		<PageHeader />
		<v-main class="flex" style="flex: 1">
			<v-container>
				<PageMenu :menu="menuItems" />
				<v-sheet class="p2" elevation="3" height="100%" width="100%">
					<router-view />
				</v-sheet>
			</v-container>
		</v-main>
	</v-app>
</template>
<script lang="ts">
import { storeToRefs } from 'pinia'
import PageHeader from '@/components/default/page-header.vue'
import PageMenu from '@/components/default/page-menu.vue'
import { useConfigurationStore } from '@/stores/configuration'

export default {
	name: 'MainComponent',
	components: { PageHeader, PageMenu },
	props: {
		brand: {
			type: Object,
			default: null,
			required: false
		},
		authentication: {
			type: Object,
			default: null,
			required: false
		},
		menu: {
			type: Array<MenuItem>,
			default: null,
			required: false
		},
		api: {
			type: Object,
			default: null,
			required: false
		},
		sources: {
			type: Object,
			default: null,
			required: false
		}
	},
	data() {
		const store = useConfigurationStore()
		const { menu: storeMenu } = storeToRefs(store)
		return { menuItems: storeMenu }
	},
	beforeMount: function () {
		const store = useConfigurationStore()
		store.setupAuthentication(this.authentication)
		store.setupBrand(this.brand)
		store.setupMenu(this.menu)
		store.setupSources(this.sources)
		store.setupApi(this.api)
	}
}
</script>
