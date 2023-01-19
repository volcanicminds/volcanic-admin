<template>
	<ValidationProvider v-slot="{ errors }" :name="name" :rules="getModelRules(options?.validation)">
		<v-text-field
			:name="name"
			:value="value"
			:type="type"
			:style="styling"
			:readonly="readonly"
			:disabled="disabled"
			@input="emitValue"
		/>
		<span v-if="symbol">{{ symbol }}</span>
		<InputError :error="errors[0]" />
	</ValidationProvider>
</template>

<script setup lang="ts">
import { getModelRules } from '@/utils/validationHelpers'
import InputError from '@/components/structural/detail/inputs/common/inputError.vue'
import { computed, ref } from 'vue'
const emit = defineEmits(['input'])

const props = defineProps({
	name: { type: String, required: true },
	type: { type: String, required: true },
	value: { type: [String, Number, Boolean, Array], default: '', required: true },
	symbol: { type: String, default: null, required: false },
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

function emitValue(value: string | number) {
	emit('input', { value, key: props.name })
}
</script>
