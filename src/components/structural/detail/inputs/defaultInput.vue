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

<script lang="ts">
import { defineComponent } from 'vue'
import { getModelRules } from '@/utils/validationHelpers'
import InputError from '@/components/structural/detail/inputs/common/inputError.vue'

export default defineComponent({
	name: 'DefaultInput',
	components: { InputError },
	props: {
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
	},
	computed: {
		styling: function () {
			return this.options?.style
		}
	},
	methods: {
		emitValue(value: string | number) {
			this.$emit('input', { value, key: this.name })
		},
		getModelRules
	}
})
</script>
