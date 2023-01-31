<template>
	<ValidationProvider v-slot="{ errors }" :name="name" :rules="getModelRules(options?.validation)">
		<v-dialog ref="dialog" v-model="modal" :return-value.sync="internalValue" persistent width="300px">
			<template #activator="{ on, attrs }">
				<v-text-field
					:value="formattedValue"
					prepend-icon="mdi-calendar"
					readonly
					v-bind="attrs"
					v-on="on"
				></v-text-field>
			</template>
			<v-date-picker v-model="internalValue" scrollable :style="styling">
				<v-spacer></v-spacer>
				<v-btn text color="primary" @click="modal = false"> Cancel </v-btn>
				<v-btn text color="primary" @click="emitFormattedValue"> OK </v-btn>
			</v-date-picker>
		</v-dialog>
		<InputError :error="errors[0]" />
	</ValidationProvider>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import InputError from '@/components/structural/detail/inputs/common/inputError.vue'
import { getModelRules } from '@/utils/validationHelpers'
import { DEFAULT_INPUT_DATE_FORMAT, DEFAULT_DATE_FORMAT } from '@/utils/constants'
import { computed, ref, watch } from 'vue'
const emit = defineEmits(['input'])
dayjs.extend(customParseFormat)

const props = defineProps({
	name: { type: String, required: true },
	type: { type: String, required: true },
	initialValue: { type: [Number, Boolean, String, Array<any>], default: '', required: true },
	options: {
		type: Object,
		default() {
			return {}
		}
	},
	readonly: { type: Boolean },
	disabled: { type: Boolean }
})

const modal = ref(false)
const propsValue = computed(() => props.initialValue)
const internalValue = ref('')
const formattedValue = ref(formatInput(props.initialValue as string))

const styleRef = ref(props.options?.style)
const styling = computed(() => styleRef.value)

watch(propsValue, (newValue) => {
	//for now you can only select a single date
	//the templating string is here for typescript reasons
	formattedValue.value = formatInput(newValue as string)
})

function emitFormattedValue() {
	modal.value = false
	const formattedVal = formatOuput()
	emit('input', { value: formattedVal, key: props.name })
}
function formatOuput() {
	return internalValue.value ? dayjs(internalValue.value, DEFAULT_INPUT_DATE_FORMAT).toISOString() : ''
}
function formatInput(newValue: string) {
	return newValue ? dayjs(newValue).format(props.options?.format || DEFAULT_DATE_FORMAT) : ''
}
</script>
