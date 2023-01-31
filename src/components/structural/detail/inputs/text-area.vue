<template>
	<ValidationProvider v-slot="{ errors }" :name="name" :rules="getModelRules(options?.validation)">
		<v-textarea
			:name="name"
			:value="value"
			:style="styling"
			:readonly="readonly"
			:disabled="disabled"
			auto-grow
			rows="4"
			@input="emitValue"
		></v-textarea>
		<InputError :error="errors[0]" />
	</ValidationProvider>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getModelRules } from '@/utils/validationHelpers'
import InputError from '@/components/structural/detail/inputs/common/inputError.vue'
const emit = defineEmits(['input'])

const props = defineProps({
	name: { type: String, required: true },
	value: { type: [String, Number, Boolean, Array], default: '', required: true },
	options: {
		type: Object,
		default() {
			return {}
		}
	},
	readonly: { type: Boolean },
	disabled: { type: Boolean }
})

const styleRef = ref(props.options?.style)
const styling = computed(() => styleRef.value)

function emitValue(value: string) {
	emit('input', { value, key: props.name })
}
</script>
