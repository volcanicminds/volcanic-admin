<template>
	<p>
		{{ error }}
	</p>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
	name: 'InputError',
	props: {
		error: { type: String, default: '', required: true }
	}
})
</script>
