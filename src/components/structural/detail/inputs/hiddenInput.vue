<template>
	<input :name="name" :value="value" type="hidden" />
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
	name: 'HiddenInput',
	props: {
		name: { type: String, required: true },
		value: { type: [String, Number, Boolean, Array], default: '', required: true }
	}
})
</script>
