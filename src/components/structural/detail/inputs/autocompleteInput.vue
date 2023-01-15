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

<script lang="ts">
import Vue, { defineComponent } from 'vue'
import { getModelRules } from '@/utils/validationHelpers'
import * as api from '@/utils/apiInternalInterface'
import InputError from '@/components/structural/detail/inputs/common/inputError.vue'

export default defineComponent({
	name: 'AutocompleteInput',
	components: { InputError },
	props: {
		name: { type: String, required: true },
		initialValue: { type: [String, Array<any>], default: '', required: true },
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
	},
	data() {
		return { search: '', isLoading: false, selectItems: [] }
	},
	computed: {
		styling: function () {
			return this.options?.style
		}
	},
	watch: {
		search(searchValue: string) {
			// Lazily load input items
			if (this.itemsSource !== 'static') {
				this.isLoading = true
				const filters = searchValue
					? [
							{
								key: this.labelField,
								operator: 'contains',
								value: searchValue
							}
					  ]
					: []
				api
					.find(this.itemsSource, {
						filters,
						sorting: {},
						pagination: {}
					})
					.then((res) => {
						this.selectItems = res
					})
					.catch((err) => {
						console.error(err)

						Vue.$toast.open({
							message: this.$t('toasts.cannotGetSource', { source: this.itemsSource }),
							type: 'error',
							position: 'bottom'
						})
					})
					.finally(() => (this.isLoading = false))
			} else {
				this.selectItems = this.items.filter((item) => {
					return item[this.labelField].some((val: string) => val.toLowerCase() === searchValue.toLocaleLowerCase())
				})
			}
		}
	},
	methods: {
		emitValue(value: any | Array<any>) {
			if (value instanceof Array) {
				value = value.map((v) => v[this.valueField])
			} else {
				value = value[this.valueField]
			}
			this.$emit('input', { value, key: this.name })
		},
		getModelRules
	}
})
</script>
