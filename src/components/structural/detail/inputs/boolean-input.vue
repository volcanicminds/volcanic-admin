<template>
	<ValidationProvider v-slot="{ errors }" :name="name" :rules="getModelRules(options?.validation)">
		<v-checkbox
			v-model="internalValue"
			:name="name"
			:style="styling"
			:readonly="readonly"
			:disabled="disabled"
			@change="emitValue"
		/>
		<InputError :error="errors[0]" />
	</ValidationProvider>
</template>

<script setup lang="ts">
import { getModelRules } from '@/utils/validationHelpers'
import InputError from '@/components/structural/detail/inputs/common/inputError.vue'
import { computed, ref, watch } from 'vue'
const emit = defineEmits(['input'])

const props = defineProps({
	name: { type: String, required: true },
	initialValue: { type: [String, Number, Boolean, Array<any>], default: false, required: true },
	options: {
		type: Object,
		default() {
			return {}
		}
	},
	readonly: { type: Boolean },
	disabled: { type: Boolean }
})

const internalValue = ref()
const styleRef = ref(props.options?.style)
const styling = computed(() => styleRef.value)
const initialValue = computed(() => props.initialValue)

watch(initialValue, (newValue) => {
	internalValue.value = newValue
})

function emitValue(value: string) {
	emit('input', { value, key: props.name })
}
</script>
