import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '../../stores/user'

export default () => {
	describe('User Store', () => {
		beforeEach(() => {
			// creates a fresh pinia and make it active so it's automatically picked
			// up by any useStore() call without having to pass it to it:
			// `useStore(pinia)`
			setActivePinia(createPinia())
		})

		it('has valid starting values', () => {
			const store = useUserStore()
			expect(store).toBeDefined()
			expect(store.username).toBeFalsy()
			expect(store.email).toBeFalsy()
			expect(store.authToken).toBeFalsy()
			expect(store.role).toBeFalsy()
		})

		it('returns valid isLogged getters value', () => {
			const store = useUserStore()
			expect(store.isLogged).toBe(false)
			store.authToken = 'token'
			expect(store.isLogged).toBe(true)
		})

		it('resets the right fields when logging out', () => {
			const store = useUserStore()
			const { logout } = store

			store.authToken = 'token'
			store.username = 'username'
			store.email = 'email@email.com'
			store.role = { name: 'role' }

			logout()

			expect(store.isLogged).toBeFalsy()
			expect(store.authToken).toBeFalsy()
			expect(Object.keys(store.role).length).toBe(0)
			expect(store.username).toBe('username')
			expect(store.email).toBe('email@email.com')
		})
	})
}
