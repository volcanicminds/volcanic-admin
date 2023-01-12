<template>
	<v-list dense nav>
		<v-list-item>
			<v-list-item-content>
				<v-list-item-subtitle> {{ $t('general.adminTitle') }} </v-list-item-subtitle>
			</v-list-item-content>
		</v-list-item>
		<v-list-item v-for="(item, index) in menu" :key="index">
			<router-link
				v-if="item.name"
				:to="{
					path: `/${item.name}`
				}"
			>
				<PageMenuItem :item="item" />
			</router-link>
			<a v-if="item.operation" href="javascript:void(0);" @click="item.operation"> <PageMenuItem :item="item" /></a>
		</v-list-item>
		<v-list-item>&nbsp;</v-list-item>
		<v-list-item
			><v-list-item-content> <PageMenuLogout /></v-list-item-content>
		</v-list-item>
	</v-list>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { remapSortingParams } from '@/utils/internalMapping'
import PageMenuItem from '@/components/default/page-menu-item.vue'
import PageMenuLogout from '@/components/default/page-menu-logout.vue'

export default defineComponent({
	name: 'PageMenu',
	components: { PageMenuItem, PageMenuLogout },
	props: {
		menu: { type: Array<MenuItem>, default: [], required: true }
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
