<template>
	<Fragment>
		<div v-for="modelItemKey in Object.keys(model)" :key="modelItemKey" class="default-input-group">
			<template v-if="isVisible(modelItemKey)">
				<DynamicInput
					:initial-value="generateInitialValue(modelItemKey)"
					:model-key="modelItemKey"
					:model="model[modelItemKey]"
					@value="(e) => updateData(e)"
				/>
			</template>
		</div>
	</Fragment>
</template>

<script setup lang="ts">
import DynamicInput from '@/components/structural/detail/dynamicInput.vue'
import { getInitialValue } from '@/utils/detailComodities'

const props = defineProps({
	data: {
		type: Object,
		default() {
			return {} as ApiBody
		},
		required: true
	},
	layout: {
		type: Object,
		default() {
			return {} as DetailLayout
		},
		required: true
	},
	model: {
		type: Object,
		required: true
	},
	isVisible: {
		type: Function,
		required: true
	},
	updateData: {
		type: Function,
		required: true
	}
})

function generateInitialValue(key: string) {
	return getInitialValue(props.data[key], props.model, key)
}
</script>
