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

<script setup lang="ts">
import DynamicInput from '@/components/structural/detail/dynamicInput.vue'
import { getInitialValue } from '@/utils/detailComodities'
import { ref } from 'vue'
import { Fragment } from 'vue-fragment'
import { VTabs, VTab, VTabsItems, VTabItem } from 'vuetify/lib'

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

const activeTab = ref(0)

function generateInitialValue(key: string): string | number | boolean {
	return getInitialValue(props.data[key], props.model, key)
}
</script>
