<template>
	<div class="mb1">
		<v-btn elevation="2" @click="create"><v-icon left dark> add </v-icon>{{ $t('table.createButton') }}</v-btn>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
	name: 'TableHeader',
	props: {
		source: { type: String, default: '', required: true }
	},
	methods: {
		create() {
			this.$router.push(`/${this.source}/create`)
		}
	}
})
</script>
