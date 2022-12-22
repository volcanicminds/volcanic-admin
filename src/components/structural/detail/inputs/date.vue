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
			<v-date-picker v-model="internalValue" scrollable>
				<v-spacer></v-spacer>
				<v-btn text color="primary" @click="modal = false"> Cancel </v-btn>
				<v-btn text color="primary" @click="emitFormattedValue"> OK </v-btn>
			</v-date-picker>
		</v-dialog>
		<InputError :error="errors[0]" />
	</ValidationProvider>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import InputError from '@/components/structural/detail/inputs/common/inputError.vue'
import { getModelRules } from '@/utils/validationHelpers'
dayjs.extend(customParseFormat)

import { DEFAULT_INPUT_DATE_FORMAT, DEFAULT_DATE_FORMAT } from '@/utils/constants'

export default defineComponent({
	name: 'DateInput',
	components: { InputError },
	props: {
		name: { type: String, required: true },
		type: { type: String, required: true },
		value: { type: String, default: '', required: true },
		options: {
			type: Object,
			default() {
				return {}
			}
		},
		readonly: { type: Boolean },
		disabled: { type: Boolean }
	},
	data() {
		return { modal: false, internalValue: '', formattedValue: '' }
	},
	computed: {
		styling: function () {
			return this.options?.style
		}
	},
	watch: {
		value: function (newValue) {
			this.formattedValue = this.formatInput(newValue)
		}
	},
	methods: {
		emitFormattedValue() {
			this.modal = false
			const formattedVal = this.formatOuput()
			this.$emit('input', { value: formattedVal, key: this.name })
		},
		formatOuput: function () {
			return this.internalValue ? dayjs(this.internalValue, DEFAULT_INPUT_DATE_FORMAT).toISOString() : ''
		},
		formatInput: function (newValue: string) {
			return newValue ? dayjs(newValue).format(this.options?.format || DEFAULT_DATE_FORMAT) : ''
		},
		getModelRules
	}
})
</script>
