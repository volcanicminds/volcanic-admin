import Vue from 'vue'
import { _find, _count, _findOne, _create, _update, _delete, _deleteMultiple } from '@/api'
import type { AxiosResponse } from 'axios'
import { useConfigurationStore } from '@/stores/configuration'
import i18n from '@/locale/i18n'

function getApi() {
	const store = useConfigurationStore()
	return store.api
}

async function find(source: string, options?: TableRoutingParams) {
	const { filters, sorting, pagination } = options || {}
	let response = {} as AxiosResponse

	const query = getApi().remapSource({ filters, sorting, pagination })
	try {
		response = await _find(source, query)
	} catch (e) {
		console.error('Error during find', e)

		Vue.$toast.open({
			message: i18n.t('toasts.cannotGetSource', { source }),
			type: 'error',
			position: 'bottom'
		})
		throw e
	}

	return getApi().remapResponse(source, response.data)
}

async function count(source: string, options?: TableRoutingParams) {
	const { filters } = options || {}
	let response = {} as AxiosResponse

	const query = getApi().remapSource({ filters })
	try {
		response = await _count(source, query)
	} catch (e) {
		console.error('Error during find', e)

		Vue.$toast.open({
			message: i18n.t('toasts.cannotGetSource', { source }),
			type: 'error',
			position: 'bottom'
		})
		throw e
	}

	return getApi().remapResponse(source, response.data)
}

async function findOne(source: string, id: string | number) {
	let response = null
	try {
		response = await _findOne(source, id)
	} catch (e) {
		console.error('Error during find by id', e)

		Vue.$toast.open({
			message: i18n.t('toasts.cannotGetSource', { source }),
			type: 'error',
			position: 'bottom'
		})
		throw e
	}

	return getApi().remapResponse(source, response.data)
}

async function create(source: string, data: ApiRequestBody) {
	let response = null
	try {
		response = await _create(source, data)
	} catch (e) {
		console.error('Error during create', e)

		Vue.$toast.open({
			message: i18n.t('toasts.errorCreate'),
			type: 'error',
			position: 'bottom'
		})
		throw e
	}

	return getApi().remapResponse(source, response.data)
}

async function update(source: string, id: string, data: ApiRequestBody) {
	let response = null
	try {
		response = await _update(source, id, data)
	} catch (e) {
		console.error('Error during update', e)

		Vue.$toast.open({
			message: i18n.t('toasts.errorUpdate'),
			type: 'error',
			position: 'bottom'
		})
		throw e
	}

	return getApi().remapResponse(source, response.data)
}

async function del(source: string, id: string) {
	let response = null
	try {
		response = await _delete(source, id)
	} catch (e) {
		console.error('Error during delete', e)

		Vue.$toast.open({
			message: i18n.t('toasts.errorDelete'),
			type: 'error',
			position: 'bottom'
		})
		throw e
	}

	return getApi().remapResponse(source, response.data)
}

async function deleteMultiple(source: string, ids: Array<string>) {
	let response = null
	try {
		response = await _deleteMultiple(source, ids)
	} catch (e) {
		console.error('Error during delete', e)

		Vue.$toast.open({
			message: i18n.t('toasts.errorDelete'),
			type: 'error',
			position: 'bottom'
		})
		throw e
	}

	return getApi().remapResponse(source, response.data)
}

export { find, count, findOne, create, update, del, deleteMultiple }
