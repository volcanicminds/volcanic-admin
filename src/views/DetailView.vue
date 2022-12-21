<template>
	<div id="detail-container">
		<h3 v-show="mode === 'update'">Dettaglio {{ source }} con id {{ id }}</h3>
		<h3 v-show="mode === 'create'">Crea nuovo {{ source }}</h3>
		<ValidationObserver ref="detail" v-slot="{ invalid }">
			<form @submit.prevent="onSubmit">
				<!-- Not configured with a model -->
				<template v-if="renderingStrategy === 'default'">
					<div v-for="dataItemKey in Object.keys(data)" :key="dataItemKey" class="default-input-group">
						<ValidationProvider v-slot="{ errors }" :name="dataItemKey" rules="required">
							<label :for="dataItemKey">{{ capitalize(dataItemKey) }}*</label>
							<v-text-field v-model="data[dataItemKey]" :name="dataItemKey" type="text" :placeholder="dataItemKey" />
							<p>{{ errors[0] }}</p>
						</ValidationProvider>
					</div>
				</template>
				<!-- Configured by the model -->
				<template v-else>
					<!--Tabs layout -->
					<template v-if="layout.type === 'tabs'">
						<TabsLayout
							:data="data"
							:layout="layout"
							:model="model"
							:is-visible="isVisible"
							:update-data="updateData"
						/>
					</template>
					<!--Default layout -->
					<template v-else>
						<DefaultLayout
							:data="data"
							:layout="layout"
							:model="model"
							:is-visible="isVisible"
							:update-data="updateData"
						/>
					</template>
				</template>
				<v-btn class="mr2" @click="backToTable"><v-icon dark left>chevron_left</v-icon>Indietro</v-btn>
				<v-btn type="submit" :disabled="invalid" color="primary"><v-icon dark left>check</v-icon>Conferma</v-btn>
			</form>
		</ValidationObserver>
	</div>
</template>

<script lang="ts">
import Vue from 'vue'
import { capitalize } from 'lodash'
import { ValidationObserver, extend, ValidationProvider } from 'vee-validate'
import * as api from '@/utils/apiInternalInterface'
import * as rules from 'vee-validate/dist/rules'
import { normalizeDetailTabName } from '@/utils/normalization'
import { defineComponent } from 'vue'
import TabsLayout from '@/components/structural/detail/tabs-layout.vue'
import DefaultLayout from '@/components/structural/detail/default-layout.vue'
import { useTablesStore } from '@/stores/tables'
import { DEFAULT_SCOPE, SCOPE_CREATE, SCOPE_UPDATE } from '@/utils/constants'
import { useConfigurationStore } from '@/stores/configuration'

Object.keys(rules).forEach((ruleKey) => {
	const rule = (rules as { [key: string]: any })[ruleKey]
	extend(ruleKey, rule)
})
async function findOne(source: string, id: string | number) {
	return await api.findOne(source, id)
}
function getMode(id: string) {
	return id === 'create' ? 'create' : 'update'
}

export default defineComponent({
	components: { ValidationObserver, DefaultLayout, TabsLayout },
	data: () => {
		return {
			// renderingStrategy: 'default' as RenderingStrategy,
			model: {} as ConfigSourceModelColumns,
			modelSourceData: {} as ModelSouceData,
			data: {} as DetailData,
			source: '',
			id: '',
			mode: 'update',
			loader: { show: () => null, close: () => null },
			observer: null as any
		}
	},

	computed: {
		renderingStrategy: function () {
			return this.model && Object.keys(this.model).length > 0 ? 'configured' : 'default'
		},
		layout: function () {
			const layout = { type: 'default' } as DetailLayout
			if (this.model) {
				const model = this.model

				//For now there only is the TABS layout
				const layoutType = Object.keys(model).find((key) => model[key].input.options?.layout?.tab != null)
					? 'tabs'
					: 'default'

				if (layoutType === 'default') {
					return layout
				}

				//For now there only is the TABS layout
				layout.type = layoutType
				layout.tabs = {}
				const uncategorizedInputs = [] as Array<string>
				Object.keys(model).forEach((key) => {
					const tab = model[key].input.options?.layout?.tab
					if (!tab) {
						uncategorizedInputs.push(key)
					} else {
						const tabName = normalizeDetailTabName(tab?.title || '')
						if (!layout.tabs[tabName]) {
							layout.tabs[tabName] = {
								title: tab?.title || '',
								inputNames: []
							}
						}
						layout.tabs[tabName].inputNames.push(key)
					}
				})

				//Every inputs without a tab layout goes in the first tab
				const firstTab = Object.keys(layout.tabs)[0]
				const firstTabeInputNamsWithUncategorized = layout.tabs[firstTab].inputNames.concat(uncategorizedInputs)
				layout.tabs[firstTab].inputNames = firstTabeInputNamsWithUncategorized
			}

			return layout
		}
	},

	watch: {
		id: function () {
			this.mode = getMode(this.id)
		}
	},

	mounted() {
		this.observer = this.$refs.detail as InstanceType<typeof ValidationObserver>
		this.id = this.$route.params?.id
		this.mode = getMode(this.id)
		this.source = this.$route.params?.source

		if (!this.source) {
			Vue.$toast.open({
				message: 'Informazione mancante: sorgente dati',
				type: 'warning',
				position: 'bottom'
			})
		}

		this.loader = this.$veLoading({
			target: '#table-container',
			name: 'grid',
			tip: 'Sto caricando...'
		})
		// this.loader.show()
		this.loadModel()
		this.loadDetail()
		// this.loader.close()
	},

	methods: {
		isVisible(key: string) {
			const condition = this.model[key].input.condition
			const scope = this.model[key].input.scope || DEFAULT_SCOPE
			const isInScope =
				scope === DEFAULT_SCOPE ||
				(scope === SCOPE_CREATE && this.mode === 'create') ||
				(scope === SCOPE_UPDATE && this.mode === 'update')

			if (condition && isInScope) {
				const valueToEvaluate = this.data[condition.field]
				switch (condition.operator) {
					case 'eq': {
						return valueToEvaluate === condition.value
					}
					case 'neq': {
						return valueToEvaluate !== condition.value
					}
					case 'lt': {
						return valueToEvaluate < condition.value
					}
					case 'lte': {
						return valueToEvaluate <= condition.value
					}
					case 'mt': {
						return valueToEvaluate > condition.value
					}
					case 'mte': {
						return valueToEvaluate >= condition.value
					}
					default: {
						console.error('Errore di configurazione altCondition operator')
						return false
					}
				}
			}

			return !condition && isInScope
		},
		backToTable() {
			const store = useConfigurationStore()
			const menuItem = store.menu.find((m) => {
				return m.source === this.source
			})
			this.$router.push(`/${(menuItem || {}).name || this.source}`)
		},
		updateData({ event, key }: { event: any; key: string }) {
			this.data = Object.assign({}, { ...this.data, ...{ [key]: event?.value } })
		},
		capitalize: function (string: string) {
			return capitalize(string)
		},
		loadDetail: async function () {
			if (this.mode === 'update') {
				try {
					this.data = await findOne(this.source, this.id)
				} catch (e) {
					console.error(e)
				}
			}
		},
		loadModel: async function () {
			const store = useConfigurationStore()
			const sourceModel = store.sources[this.source]
			if (!sourceModel) {
				console.warn('Configuration model missing')
			} else {
				this.model = sourceModel.columns
			}

			//Adding a fake data array taken from the column definition, to render the create form
			//event withou a model
			if (Object.keys(this.model).length === 0 && this.mode === 'create') {
				const tableStore = useTablesStore()
				const fakeData = {} as { [key: string]: any }
				const storeColumnDefinitions = tableStore.tables.columnDefinitions[this.source] || []

				if (storeColumnDefinitions.length === 0) {
					alert('Impossibile visualizzare la form di creazione')
					throw new Error('Cannot show create form')
				}
				storeColumnDefinitions.forEach((def) => {
					if (def.field && def.field !== 'id') {
						fakeData[def.field] = ''
					}
				})

				this.data = fakeData
			}
		},
		onSubmit: async function () {
			if (this.mode == 'create') {
				await api.create(this.source, this.data)
			} else {
				await api.update(this.source, this.id, this.data)
			}
			this.observer.reset()
			Vue.$toast.open({
				message: this.mode === 'create' ? 'Elemento creato con successo' : 'Elemento aggiornato con successo',
				type: 'success',
				position: 'bottom'
			})
			this.backToTable()
		}
	}
})
</script>
<style lang="stylus" scoped>
#detail-container
	padding 0 10rem
</style>
