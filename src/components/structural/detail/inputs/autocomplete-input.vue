<!-- eslint-disable vue/no-v-text-v-html-on-component -->
<template>
	<ValidationProvider v-slot="{ errors }" :name="name" :rules="getModelRules(options?.validation)">
		<v-autocomplete
			:name="name"
			:value="initialValue"
			:items="selectItems"
			:loading="isLoading"
			:style="styling"
			:search-input.sync="search"
			hide-no-data
			hide-selected
			:multiple="multiple"
			:item-text="labelField"
			:item-value="valueField"
			placeholder="Scrivi per cercare"
			return-object
			:readonly="readonly"
			:disabled="disabled"
			@change="emitValue"
		></v-autocomplete>
		<InputError :error="errors[0]" />
	</ValidationProvider>
</template>

<script setup lang="ts">
import Vue, { computed, ref, watch } from 'vue'
import { getModelRules } from '@/utils/validationHelpers'
import * as api from '@/utils/apiInternalInterface'
import InputError from '@/components/structural/detail/inputs/common/inputError.vue'
import i18n from '@/locale/i18n'
const emit = defineEmits(['input'])

const props = defineProps({
	name: { type: String, required: true },
	initialValue: { type: [String, Number, Boolean, Array<any>], default: '', required: true },
	valueField: { type: String, required: true },
	labelField: { type: String, required: true },
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
	itemsSource: { type: String, required: true },
	multiple: { type: Boolean },
	readonly: { type: Boolean },
	disabled: { type: Boolean }
})

const search = ref('')
const isLoading = ref(false)
const selectItems = ref([] as ApiResponseBody)

const styleRef = ref(props.options?.style)
const styling = computed(() => styleRef.value)

watch(search, (searchValue: string) => {
	if (props.itemsSource !== 'static') {
		isLoading.value = true
		const filters = searchValue
			? [
					{
						key: props.labelField,
						operator: 'contains',
						value: searchValue
					}
			  ]
			: []
		api
			.find(props.itemsSource, {
				filters,
				sorting: {},
				pagination: {}
			})
			.then((res) => {
				selectItems.value = res
			})
			.catch((err) => {
				console.error(err)

				Vue.$toast.open({
					message: i18n.t('toasts.cannotGetSource', { source: props.itemsSource }),
					type: 'error',
					position: 'bottom'
				})
			})
			.finally(() => (isLoading.value = false))
	} else {
		selectItems.value = props.items.filter((item) => {
			return item[props.labelField].some((val: string) => val.toLowerCase() === searchValue.toLocaleLowerCase())
		})
	}
})

function emitValue(value: any | Array<any>) {
	if (value) {
		if (value instanceof Array) {
			value = value.map((v) => {
				if (typeof v === 'object') {
					return v[props.valueField]
				}
				return v
			})
		} else {
			value = value[props.valueField]
		}
	}
	emit('input', { value, key: props.name })
}
</script>
