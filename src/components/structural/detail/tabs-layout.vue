<template>
	<div>
		<v-tabs v-model="activeTab">
			<Fragment v-for="tabKey in Object.keys(layout.tabs)" :key="tabKey">
				<v-tab>
					{{ layout.tabs[tabKey].title }}
				</v-tab>
			</Fragment>
		</v-tabs>
		<v-tabs-items v-model="activeTab" class="mt2">
			<v-tab-item v-for="tabItemKey in Object.keys(layout.tabs)" :key="tabItemKey">
				<div v-for="modelItemKey in Object.keys(model)" :key="modelItemKey" class="default-input-group">
					<template v-if="isVisible(modelItemKey) && layout.tabs[tabItemKey].inputNames?.includes(modelItemKey)">
						<DynamicInput
							:initial-value="generateInitialValue(modelItemKey)"
							:model-key="modelItemKey"
							:model="model[modelItemKey]"
							@value="(e) => updateData(e)"
						/>
					</template>
				</div>
			</v-tab-item>
		</v-tabs-items>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import DynamicInput from '@/components/structural/detail/dynamicInput.vue'
import { getInitialValue } from '@/utils/detailComodities'

export default defineComponent({
	name: 'TabsLayout',
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
			return getInitialValue(this.data[key], this.model, key)
		}
	}
})
</script>
