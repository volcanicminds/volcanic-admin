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

<script lang="ts">
import { defineComponent } from 'vue'
import DynamicInput from '@/components/structural/detail/dynamicInput.vue'
import { getInitialValue } from '@/utils/detailComodities'

export default defineComponent({
	name: 'DefaultLayout',
	components: { DynamicInput },
	props: {
		data: {
			type: Object,
			default() {
				return {} as DetailData
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
	},
	data() {
		return {
			activeTab: 0
		}
	},
	methods: {
		generateInitialValue: function (key: string) {
			const value = getInitialValue(this.data[key], this.model, key)

			return value
		}
	}
})
</script>
