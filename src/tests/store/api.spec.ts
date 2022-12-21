import { setActivePinia, createPinia } from 'pinia'
import * as api from '@/utils/apiInternalInterface'
import { _find, _findOne, _create, _update, _delete } from '@/api'

let backupApi: { [field: string]: (param1?: any, param2?: any, param3?: any) => unknown }

export default () => {
	describe('Api Store', () => {
		beforeAll(() => {
			backupApi = Object.assign({}, { _find, _findOne, _create, _update, _delete })
			_find.prototype = (source: string) => ({
				source
			})
			_findOne.prototype = (source: string, id: string) => ({
				source,
				id
			})
			_update.prototype = (source: string, id: string, data: ApiRequestBody) => ({
				source,
				id,
				data
			})
			_create.prototype = (source: string, data: ApiRequestBody) => ({
				source,
				data
			})
			_delete.prototype = (source: string, id: string) => ({
				source,
				id
			})
		})
		afterAll(() => {
			_find.prototype = backupApi._find
			_findOne.prototype = backupApi._findOne
			_create.prototype = backupApi._create
			_update.prototype = backupApi._update
			_delete.prototype = backupApi._delete
		})
		beforeEach(() => {
			// creates a fresh pinia and make it active so it's automatically picked
			// up by any useStore() call without having to pass it to it:
			// `useStore(pinia)`
			setActivePinia(createPinia())
		})

		it('starts the find request', async () => {
			const source = 'test'
			const found = await api.find(source, {})
			//TODO: design better tests
			expect(found).toBeDefined()
		})

		it('starts the findOne request', async () => {
			const source = 'test'
			const found = await api.findOne(source, 'id')
			//TODO: design better tests
			expect(found).toBeDefined()
		})

		it('starts the update request', async () => {
			const source = 'test'
			const updated = await api.update(source, 'id', {})
			//TODO: design better tests
			expect(updated).toBeDefined()
		})

		it('starts the create request', async () => {
			const source = 'test'
			const created = await api.create(source, {})
			//TODO: design better tests
			expect(created).toBeDefined()
		})

		it('starts the delete request', async () => {
			const source = 'test'
			const deleted = await api.del(source, 'id')
			//TODO: design better tests
			expect(deleted).toBeDefined()
		})
	})
}
