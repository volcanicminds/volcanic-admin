<template>
	<v-app>
		<PageHeader :toggle-drawer="toggleDrawer" />
		<v-main class="flex" style="flex: 1">
			<v-container>
				<v-navigation-drawer v-model="drawer" absolute temporary>
					<PageMenu :menu="menuItems" />
				</v-navigation-drawer>
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
		return { store, menuItems: storeMenu, drawer: false }
	},
	beforeMount: function () {
		this.store.setupAuthentication(this.authentication as Authconfiguration)
		this.store.setupBrand(this.brand)
		this.store.setupSources(this.sources)
		this.store.setupMenu(this.menu)
		this.store.setupApi(this.api as Api)
	},
	methods: {
		toggleDrawer: function () {
			this.drawer = !this.drawer
		}
	}
}
</script>
