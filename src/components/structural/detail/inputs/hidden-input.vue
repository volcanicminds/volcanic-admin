<template>
	<input :name="name" :value="value" type="hidden" />
</template>

<script setup lang="ts">
defineProps({
	name: { type: String, required: true },
	value: { type: [String, Number, Boolean, Array], default: '', required: true }
})
</script>
