<template>
	<v-app-bar app dense elevation="4">
		<v-spacer></v-spacer>
		<a style="width: 36px" class="mx2" title="Tema" href="#" @click="toggleDarkMode"
			><v-icon large>brightness_4_icon</v-icon></a
		>
		<router-link title="Utente" to="/user"><v-icon large>person</v-icon></router-link>
	</v-app-bar>
</template>

<script lang="ts">
import { useConfigurationStore } from '@/stores/configuration'
import { THEMES } from '@/utils/constants'
import { defineComponent } from 'vue'
export default defineComponent({
	name: 'PageHeader',
	methods: {
		toggleDarkMode: function () {
			const store = useConfigurationStore()
			store.theme = store.theme === THEMES.dark ? THEMES.light : THEMES.dark
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
