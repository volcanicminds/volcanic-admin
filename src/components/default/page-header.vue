<template>
	<v-app-bar app dense elevation="4">
		<v-app-bar-nav-icon @click.stop="toggleDrawer"></v-app-bar-nav-icon>

		<div class="text-h6">
			<router-link to="/">
				<span v-if="store?.company?.name && !store?.company?.logo && !store?.company?.logo_alt" class="h1 caps bold">{{
					store?.company?.name
				}}</span>
				<img
					v-if="store?.company?.logo && store.theme === THEMES.light"
					:style="{ height: store?.company?.logo_height || '50px', width: store?.company?.logo_width || 'auto' }"
					class="py1"
					:title="store?.company?.name"
					:src="store?.company?.logo"
				/>
				<img
					v-if="(store?.company?.logo_alt || store?.company?.logo) && store.theme === THEMES.dark"
					:style="{ height: store?.company?.logo_height || '50px', width: store?.company?.logo_width || 'auto' }"
					class="py1"
					:title="store?.company?.name"
					:src="store?.company?.logo_alt || store?.company?.logo"
				/>
			</router-link>
		</div>
		<v-spacer></v-spacer>
		<a style="width: 36px" class="mx2" :title="$t('general.theme')" href="#" @click="toggleDarkMode"
			><v-icon large>brightness_4_icon</v-icon></a
		>
		<router-link :title="$t('general.user')" to="/user"><v-icon large>person</v-icon></router-link>
	</v-app-bar>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useConfigurationStore } from '@/stores/configuration'
import { THEMES } from '@/utils/constants'

export default defineComponent({
	name: 'PageHeader',
	props: {
		toggleDrawer: {
			type: Function,
			default: () => null,
			required: true
		}
	},
	setup() {
		const store = useConfigurationStore()

		return { store, THEMES }
	},
	methods: {
		toggleDarkMode: function () {
			this.store.theme = this.store.theme === THEMES.dark ? THEMES.light : THEMES.dark
		}
	}
})
</script>
<style lang="stylus" scoped>
header
	max-height 50px
a
	text-decoration none
</style>
