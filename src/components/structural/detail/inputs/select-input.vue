<template>
	<ValidationProvider v-slot="{ errors }" :name="name" :rules="getModelRules(options?.validation)">
		<v-select
			:name="name"
			:items="selectItems"
			:item-text="labelField"
			:item-value="valueField"
			:style="styling"
			:readonly="readonly"
			:multiple="multiple"
			:disabled="disabled"
			:value="value"
			@change="emitValue"
		/>
		<InputError :error="errors[0]" />
	</ValidationProvider>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { getModelRules } from '@/utils/validationHelpers'
import * as api from '@/utils/apiInternalInterface'
import InputError from '@/components/structural/detail/inputs/common/inputError.vue'
const emit = defineEmits(['input'])

const props = defineProps({
	name: { type: String, required: true },
	value: { type: [String, Boolean, Number, Array<any>], default: '', required: true },
	valueField: { type: String, required: true },
	labelField: { type: String, required: true },
	itemsSource: { type: String, required: true },
	options: {
		type: Object,
		default() {
			return {}
		}
	},
	items: {
		type: Array<any>,
		default() {
			return []
		}
	},
	multiple: { type: Boolean },
	readonly: { type: Boolean },
	disabled: { type: Boolean }
})

const selectItems = ref(props.items as ApiResponseBody)
const styleRef = ref(props.options?.style)
const styling = computed(() => styleRef.value)

onMounted(() => {
	if (props.itemsSource !== 'static') {
		api.find(props.itemsSource).then((items) => (selectItems.value = items))
	}
})

function emitValue(value: string | Array<string>) {
	emit('input', { value, key: props.name })
}
</script>
