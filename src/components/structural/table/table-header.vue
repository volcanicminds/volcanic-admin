<template>
	<Fragment>
		<div class="mb1">
			<v-btn elevation="2" @click="create"><v-icon left dark> add </v-icon>{{ $t('table.createButton') }}</v-btn>
			<v-btn v-if="options?.canDelete" :disabled="!hasSelectedRows" class="ml1" elevation="2" @click="deleteAllConfirm"
				><v-icon left dark> delete </v-icon>{{ $t('table.deleteAll') }}</v-btn
			>
		</div>
	</Fragment>
</template>

<script lang="ts">
import router from '@/router'
import { useI18n } from '@/composables/i18n'

export default {
	props: {
		source: { type: String, default: '', required: true },
		deleteAll: { type: Function, default: () => null, required: false },
		hasSelectedRows: { type: Boolean, default: false, required: false },
		options: { type: Object, default: null, required: false }
	},
	setup(props) {
		const { t } = useI18n()

		function deleteAllConfirm() {
			const confirmed = window.confirm(t('table.confirmDeleteAll'))
			if (confirmed) {
				props.deleteAll()
			}
		}

		function create() {
			router.push(`/${props.source}/create`)
		}

		return { create, deleteAllConfirm }
	}
}
</script>
