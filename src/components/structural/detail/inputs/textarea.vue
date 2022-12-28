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

<script lang="ts">
import { defineComponent } from 'vue'
import { getModelRules } from '@/utils/validationHelpers'
import InputError from '@/components/structural/detail/inputs/common/inputError.vue'

export default defineComponent({
	name: 'TextArea',
	components: { InputError },
	props: {
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
