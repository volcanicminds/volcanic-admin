import { setActivePinia, createPinia } from 'pinia'
import { useConfigurationStore } from '../../stores/configuration'

export default () => {
	describe('Configuration Store', () => {
		beforeEach(() => {
			// creates a fresh pinia and make it active so it's automatically picked
			// up by any useStore() call without having to pass it to it:
			// `useStore(pinia)`
			setActivePinia(createPinia())
		})

		it('has valid starting values', () => {
			const store = useConfigurationStore()
			expect(store).toBeDefined()
			expect(store.tableStrategy).toBe('full')
			expect(store.theme).toBe('light')
		})
	})
}
