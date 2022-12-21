import { setActivePinia, createPinia } from 'pinia'
import { useTablesStore } from '../../stores/tables'
import { find, findOne, create, update, del } from '@/utils/apiInternalInterface'

const backupApi = Object.assign({}, { find, findOne, create, update, del })
const TESTDATA = {
	single: { id: 1, surname: 'surname1' },
	multipleRows: [
		{ id: 1, name: 'name1' },
		{ id: 2, name: 'name2' },
		{ id: 3, name: 'name3' }
	]
}
export default () => {
	describe('Tables Store', () => {
		beforeAll(() => {
			find.prototype = (source: string) => TESTDATA.multipleRows
			findOne.prototype = (source: string, id: string) => TESTDATA.single
			update.prototype = (source: string, id: string, data: ApiRequestBody) => TESTDATA.single
			create.prototype = (source: string, data: ApiRequestBody) => TESTDATA.single
			del.prototype = (source: string, id: string) => TESTDATA.single
		})
		afterAll(() => {
			find.prototype = backupApi.find
			findOne.prototype = backupApi.findOne
			create.prototype = backupApi.create
			update.prototype = backupApi.update
			del.prototype = backupApi.del
		})
		beforeEach(() => {
			// creates a fresh pinia and make it active so it's automatically picked
			// up by any useStore() call without having to pass it to it:
			// `useStore(pinia)`
			setActivePinia(createPinia())
		})

		it('has valid starting values', () => {
			const store = useTablesStore()
			expect(store).toBeDefined()

			expect(store.tables).toBeDefined()
			expect(Object.keys(store.tables).length).toBe(0)
		})

		it('should add a new table', () => {
			const store = useTablesStore()

			store.addTable('test_table', [])

			expect(store.tables).toBeDefined()
			expect(Object.keys(store.tables).length).toBe(1)
			expect(Object.keys(store.tables)[0]).toBe('test_table')
		})

		it('should remove a table', () => {
			const store = useTablesStore()

			store.addTable('test_table', [])
			store.deleteTable('test_table')
			expect(store.tables).toBeDefined()
			expect(Object.keys(store.tables).length).toBe(0)
		})

		it('should refresh a table', async () => {
			const store = useTablesStore()

			store.addTable('test_table', [])
			await store.refresh('test_table')
			expect(store.tables).toBeDefined()
			expect(Object.keys(store.tables).length).toBe(1)
			expect(Object.keys(store.tables)[0]).toBe('test_table')
			expect(store.tables['test_table'].length).toBe(1)
			expect(store.tables['test_table'][0]).toEqual(TESTDATA.single)
		})

		it('should add some rows', async () => {
			const store = useTablesStore()

			store.addTable('test_table', [])
			await Promise.all(TESTDATA.multipleRows.map((row) => store.addRow('test_table', row)))
			expect(store.tables['test_table'].length).toBe(3)
			TESTDATA.multipleRows.forEach((row, i) => {
				expect(store.tables['test_table'][i]).toEqual(row)
			})
		})

		it('should delete a row', async () => {
			const store = useTablesStore()

			store.addTable('test_table', [])
			await Promise.all(TESTDATA.multipleRows.map((row) => store.addRow('test_table', row)))
			await store.deleteRow('test_table', 2)

			expect(store.tables['test_table'].length).toBe(2)
			expect(store.tables['test_table'][0]).toEqual(TESTDATA.multipleRows[0])
			expect(store.tables['test_table'][1]).toEqual(TESTDATA.multipleRows[2])
		})

		it('should update a row', async () => {
			const store = useTablesStore()

			store.addTable('test_table', [])
			await store.addRow('test_table', TESTDATA.single)
			await store.updateRow('test_table', { id: 1, name: 'name1' })

			expect(store.tables['test_table'].length).toBe(1)
			expect(store.tables['test_table'][0].id).toBe(1)
			expect(store.tables['test_table'][0].name).toBe('name1')
			expect(store.tables['test_table'][0].surname).toBe('surname1')
		})
	})
}
