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

<script lang="ts">
import { defineComponent } from 'vue'
import { getModelRules } from '@/utils/validationHelpers'
import * as api from '@/utils/apiInternalInterface'
import InputError from '@/components/structural/detail/inputs/common/inputError.vue'

export default defineComponent({
	name: 'SelectInput',
	components: { InputError },
	props: {
		name: { type: String, required: true },
		value: { type: [String, Array<any>], default: '', required: true },
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
	},
	data() {
		return {
			selectItems: this.items as ApiResponseBody
		}
	},
	computed: {
		styling: function () {
			return this.options?.style
		},
		normalizedValue: function () {
			return typeof this.value === 'string' ? [this.value] : this.value
		}
	},
	mounted() {
		if (this.itemsSource !== 'static') {
			api.find(this.itemsSource).then((items) => (this.selectItems = items))
		}
	},
	methods: {
		emitValue(value: string | Array<string>) {
			this.$emit('input', { value, key: this.name })
		},
		isItChecked(value: string) {
			return this.normalizedValue.includes(value)
		},
		getModelRules
	}
})
</script>
