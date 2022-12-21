<template>
	<div class="p1">
		<span :class="`${$vuetify.theme.dark ? 'text--darken-1' : 'text--lighten-1'} text-caption`">{{ label }}</span>
		<v-text-field
			v-if="isSingle && inputType !== 'boolean'"
			:name="name"
			:value="format(values[0])"
			:type="inputType"
			:placeholder="placeholder"
			clearable
			@input="(value) => evaluateFilter(value, 0)"
		/>
		<v-checkbox
			v-if="isSingle && inputType === 'boolean'"
			:name="name"
			:checked="values[0]"
			@change="(value) => evaluateFilter(value, 0)"
		/>
		<div v-if="isDouble && inputType !== 'boolean'">
			<v-text-field
				:type="inputType"
				:name="name"
				:value="format(values[0])"
				:placeholder="placeholder"
				clearable
				@input="(value) => evaluateFilter(value, 0)"
			/>
			<v-text-field
				:type="inputType"
				:name="name"
				:value="format(values[1])"
				:placeholder="placeholder"
				clearable
				@input="(value) => evaluateFilter(value, 1)"
			/>
		</div>
		<div v-else-if="isMultiple && inputType !== 'boolean'" class="mb1">
			<template v-for="(n, i) in filterValues.length">
				<div :key="i" class="flex items-center">
					<v-text-field
						:name="name"
						:type="inputType"
						:value="format(values[i])"
						:placeholder="placeholder"
						clearable
						@input="(value) => evaluateFilter(value, i)"
					/>
					<v-btn class="ml1" small fab @click="() => removeExtraInput(i)"><v-icon small>delete</v-icon></v-btn>
				</div>
			</template>
			<v-btn @click="addExtraInput">Aggiungi<v-icon class="ml1">add</v-icon></v-btn>
		</div>
		<div>
			<v-btn class="name-filter-cancel mr1" @click="() => searchCancel()"> Annulla </v-btn>
			<v-btn class="name-filter-confirm" @click="() => searchConfirm()"> Conferma </v-btn>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import dayjs from 'dayjs'
import { FILTER_OPERATORS } from '@/utils/table'
import { DEFAULT_RELATION_SEPARATOR } from '@/utils/rest'
export default defineComponent({
	name: 'TableFilter',
	props: {
		inputType: { type: String, default: 'text' },
		values: {
			type: Array,
			default() {
				return []
			},
			required: true
		},
		subField: { type: String, default: undefined, required: false },
		name: { type: String, default: '', required: true },
		operator: {
			type: String,
			default: FILTER_OPERATORS.EQ
		},
		addFilter: { type: Function, default: () => null, required: true },
		searchCancel: { type: Function, default: () => null, required: true },
		searchConfirm: { type: Function, default: () => null, required: true }
	},
	data() {
		let label = ''
		let isDouble = false
		let isMultiple = false
		switch (this.operator) {
			case FILTER_OPERATORS.BETWEEN:
				label = 'Il valore deve essere tra i due valori'
				isDouble = true
				break
			case FILTER_OPERATORS.CONTAINS:
				label = 'Il valore deve contenere'
				break
			case FILTER_OPERATORS.CONTAINSI:
				label = 'Il valore deve contenere (maiuscole e minuscole)'
				break
			case FILTER_OPERATORS.ENDS:
				label = 'Il valore deve finire con'
				break
			case FILTER_OPERATORS.ENDSI:
				label = 'Il valore deve finire con (maiuscole e minuscole)'
				break
			case FILTER_OPERATORS.EQI:
				label = 'Il valore deve essere uguale (maiuscole e minuscole)'
				break
			case FILTER_OPERATORS.GE:
				label = 'Il valore deve essere maggiore o uguale di'
				break
			case FILTER_OPERATORS.GT:
				label = 'Il valore deve essere maggiore'
				break
			case FILTER_OPERATORS.IN:
				label = 'Il valore deve essere compreso tra'
				isMultiple = true
				break
			case FILTER_OPERATORS.LE:
				label = 'Il valore deve essere minore di'
				break
			case FILTER_OPERATORS.LIKE:
				label = 'Il valore deve essere simile a'
				break
			case FILTER_OPERATORS.LIKEI:
				label = 'Il valore deve essere simile a (maiuscole e minuscole)'
				break
			case FILTER_OPERATORS.LT:
				label = 'Il valore deve essere meno di'
				break
			case FILTER_OPERATORS.NCONTAINS:
				label = 'Il valore non deve contenere'
				break
			case FILTER_OPERATORS.NCONTAINSI:
				label = 'Il valore non deve contenere (maiuscole e minuscole)'
				break
			case FILTER_OPERATORS.NEQ:
				label = 'Il valore deve essere diverso'
				break
			case FILTER_OPERATORS.NEQI:
				label = 'Il valore deve essere diverso (maiuscole e minuscole)'
				break
			case FILTER_OPERATORS.NIN:
				label = 'Il valore non deve essere compreso tra'
				isMultiple = true
				break
			case FILTER_OPERATORS.NOTNULL:
				label = 'Il valore non deve essere nullo'
				break
			case FILTER_OPERATORS.NULL:
				label = 'Il valore deve essere nullo'
				break
			case FILTER_OPERATORS.STARTS:
				label = 'Il valore deve essere iniziare con'
				break
			case FILTER_OPERATORS.STARTSI:
				label = 'Il valore deve essere iniziare con (maiuscole e minuscole)'
				break
			default:
				label = 'Il valore deve essere uguale'
				break
		}

		let placeholder = 'Inserisci un testo'
		switch (this.inputType) {
			case 'number':
				placeholder = 'Inserisci un numero'
				break
			case 'boolean':
				placeholder = 'Seleziona un valore'
				break
			case 'date':
				placeholder = 'Scegli una data'
				break
		}

		return {
			filterValues: this.values,
			placeholder,
			label,
			isSingle: !isDouble && !isMultiple,
			isDouble,
			isMultiple
		}
	},
	methods: {
		evaluateFilter(value: string | number | boolean, index: number) {
			const operator = this.operator || FILTER_OPERATORS.EQ
			if (this.inputType === 'date') {
				value = dayjs(value as string).toISOString()
			}
			this.filterValues[index] = value

			const field = this.subField ? `${this.name}${DEFAULT_RELATION_SEPARATOR}${this.subField}` : this.name

			this.addFilter(field, operator, this.filterValues)
		},
		format(value: string | number | boolean) {
			if (this.inputType === 'date' && value) {
				return dayjs(`${value}`).format('YYYY-MM-DD')
			}
			return value
		},
		addExtraInput() {
			this.filterValues.push('')
		},
		removeExtraInput(i: number) {
			this.filterValues.splice(i, 1)

			const operator = this.operator || FILTER_OPERATORS.EQ
			this.addFilter(this.name, operator, this.filterValues)
		}
	}
})
</script>

<style lang="stylus">
.text--darken-1
	color white
.text--lighten-1
	color black
</style>
