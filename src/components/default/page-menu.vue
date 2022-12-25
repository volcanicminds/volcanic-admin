<template>
	<v-navigation-drawer app permanent>
		<v-list-item>
			<v-list-item-content>
				<v-list-item-title class="text-h6">
					<router-link to="/">
						<span
							v-if="store?.company?.name && !store?.company?.logo && !store?.company?.logo_alt"
							class="h1 caps bold"
							>{{ store?.company?.name }}</span
						>
						<img
							v-if="store?.company?.logo && store.theme === THEMES.light"
							height="50"
							:title="store?.company?.name"
							:src="store?.company?.logo"
						/>
						<img
							v-if="(store?.company?.logo_alt || store?.company?.logo) && store.theme === THEMES.dark"
							height="50"
							:title="store?.company?.name"
							:src="store?.company?.logo_alt || store?.company?.logo"
						/>
					</router-link>
				</v-list-item-title>
				<v-list-item-subtitle> {{ $t('general.adminTitle') }} </v-list-item-subtitle>
			</v-list-item-content>
		</v-list-item>
		<v-list dense nav>
			<Fragment v-for="(item, index) in menu" :key="index">
				<router-link
					v-if="item.name"
					:to="{
						path: `/${item.name}`
					}"
				>
					<PageMenuItem :item="item" />
				</router-link>
				<a v-if="item.operation" href="javascript:void(0);" @click="item.operation"> <PageMenuItem :item="item" /></a>
			</Fragment>
		</v-list>
		<template #append>
			<PageMenuLogout />
		</template>
	</v-navigation-drawer>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { remapSortingParams } from '@/utils/internalMapping'
import { useConfigurationStore } from '@/stores/configuration'
import PageMenuItem from '@/components/default/page-menu-item.vue'
import PageMenuLogout from '@/components/default/page-menu-logout.vue'
import { THEMES } from '@/utils/constants'

export default defineComponent({
	name: 'PageMenu',
	components: { PageMenuItem, PageMenuLogout },
	props: {
		menu: { type: Array<MenuItem>, default: [], required: true }
	},
	setup() {
		const store = useConfigurationStore()

		return { store, THEMES }
	},
	methods: {
		remapSortingParams
	}
})
</script>
<style lang="stylus" scoped>
a
	text-decoration none
</style>
