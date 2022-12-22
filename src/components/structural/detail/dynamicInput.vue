<template>
	<Fragment>
		<template v-if="model.input?.hidden">
			<HiddenInput :value="initialValue" :name="modelKey" />
		</template>
		<template v-else>
			<label :for="modelKey">{{ model.input.label || capitalize(modelKey) }}{{ getRequiredAsterics(modelKey) }}</label>
			<DefaultInput
				v-if="model.input.type === 'input' && !['date', 'boolean'].includes(model?.type)"
				:value="initialValue"
				:type="model?.type"
				:symbol="model?.specifications?.subtype === 'currency' ? model?.specifications?.symbol : undefined"
				:name="modelKey"
				:readonly="model.input.readonly"
				:disabled="model.input.disabled"
				:options="model.input.options"
				@input="$emit('value', { event: $event, key: modelKey })"
			/>
			<BooleanInput
				v-if="model.input.type === 'input' && model?.type === 'boolean'"
				:value="initialValue"
				:name="modelKey"
				:readonly="model.input.readonly"
				:disabled="model.input.disabled"
				:options="model.input.options"
				@input="$emit('value', { event: $event, key: modelKey })"
			/>
			<InputDate
				v-if="model.input.type === 'input' && model?.type === 'date'"
				:value="initialValue"
				:type="model?.specifications?.subtype === 'datetime' ? 'datetime-local' : 'date'"
				:name="modelKey"
				:readonly="model.input.readonly"
				:disabled="model.input.disabled"
				:options="model.input.options"
				@input="$emit('value', { event: $event, key: modelKey })"
			/>
			<TextArea
				v-if="model.input.type === 'textarea'"
				:value="initialValue"
				:style="model.input.options?.style"
				:name="modelKey"
				:readonly="model.input.readonly"
				:disabled="model.input.disabled"
				:options="model.input.options"
				@input="$emit('value', { event: $event, key: modelKey })"
			></TextArea>
			<SelectInput
				v-if="model.input.type === 'select'"
				:value="initialValue"
				:name="modelKey"
				:items-source="model.input.source"
				:readonly="model.input.readonly"
				:disabled="model.input.disabled"
				:options="model.input.options"
				:multiple="model?.specifications?.subtype === 'multiple'"
				:items="model.input.data || []"
				:value-field="model.input.dataOptions?.value || 'id'"
				:label-field="model.input.dataOptions?.label || 'label'"
				@input="$emit('value', { event: $event, key: modelKey })"
			/>
			<AutocompleteInput
				v-if="model.input.type === 'autocomplete'"
				:value="initialValue"
				:name="modelKey"
				:items-source="model.input.source"
				:readonly="model.input.readonly"
				:disabled="model.input.disabled"
				:options="model.input.options"
				:multiple="model?.specifications?.subtype === 'multiple'"
				:items="model.input.data || []"
				:value-field="model.input.dataOptions?.value || 'id'"
				:label-field="model.input.dataOptions?.label || 'label'"
				@input="$emit('value', { event: $event, key: modelKey })"
			/>
		</template>
	</Fragment>
</template>

<script lang="ts">
import { capitalize } from 'lodash'
import { defineComponent } from 'vue'
import InputDate from '@/components/structural/detail/inputs/date.vue'
import DefaultInput from '@/components/structural/detail/inputs/defaultInput.vue'
import TextArea from '@/components/structural/detail/inputs/textarea.vue'
import SelectInput from '@/components/structural/detail/inputs/selectInput.vue'
import BooleanInput from '@/components/structural/detail/inputs/booleanInput.vue'
import HiddenInput from '@/components/structural/detail/inputs/hiddenInput.vue'
import AutocompleteInput from '@/components/structural/detail/inputs/autocompleteInput.vue'
import { getModelRules } from '@/utils/validationHelpers'

export default defineComponent({
	name: 'DynamicInput',
	components: {
		InputDate,
		DefaultInput,
		TextArea,
		SelectInput,
		BooleanInput,
		HiddenInput,
		AutocompleteInput
	},
	props: {
		//The generic empty string passed as dafault is cast as boolean where the initialValue props type is a boolean
		initialValue: { type: [String, Number, Boolean, Array<string>], default: '', required: true },
		model: {
			type: Object,
			default() {
				return {}
			},
			required: true
		},
		modelKey: { type: String, default: '', required: true }
	},
	data: function () {
		return {
			value: this.initialValue
		}
	},
	watch: {
		initialValue: function () {
			this.value = this.initialValue
		}
	},
	methods: {
		capitalize: function (string: string) {
			return capitalize(string)
		},
		getRequiredAsterics: function (key: string) {
			const modelRules = getModelRules(this.model?.input?.options?.validation) //|| 'required'

			return modelRules?.includes('required') ? '*' : ''
		}
	}
})
</script>
