<template>
	<ValidationProvider v-slot="{ errors }" :name="name" :rules="getModelRules(options?.validation)">
		<v-checkbox
			:checked="value"
			:name="name"
			:style="styling"
			:readonly="readonly"
			:disabled="disabled"
			@change="emitValue"
		/>
		<InputError :error="errors[0]" />
	</ValidationProvider>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { getModelRules } from '@/utils/validationHelpers'
import InputError from '@/components/structural/detail/inputs/common/inputError.vue'

export default defineComponent({
	name: 'BooleanInput',
	components: { InputError },
	props: {
		name: { type: String, required: true },
		value: { type: Boolean, default: false, required: true },
		options: {
			type: Object,
			default() {
				return {}
			}
		},
		readonly: { type: Boolean },
		disabled: { type: Boolean }
	},
	computed: {
		styling: function () {
			return this.options?.style
		}
	},
	methods: {
		emitValue(value: string) {
			this.$emit('input', { value, key: this.name })
		},
		getModelRules
	}
})
</script>
