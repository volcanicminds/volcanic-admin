import VueRouter from 'vue-router'
import type { Route } from 'vue-router/types/router'
import menu from '@/configuration/menu'
import { get, types } from '@/utils/localStorage'
import { getAuthenticationConfig } from '@/utils/authConfig'

const router = new VueRouter({
	mode: 'hash',
	base: import.meta.env.BASE_URL,
	routes: [
		{
			path: '/',
			redirect: (to) => {
				if (menu) {
					const defaultPath = menu.find((item) => item.isDefault)?.name || menu[0]?.name || 'home'
					return { path: `/${defaultPath}` }
				}
				return { path: '/home' }
			}
		},
		{
			path: '/login',
			name: 'login',
			component: () => import('@/views/LoginView.vue')
		},
		{
			path: '/user',
			name: 'user',
			component: () => import('@/views/UserView.vue')
		},
		{
			path: '/:source',
			name: 'tables',
			component: () => import('@/views/TableView.vue')
		},
		{
			path: '/:source/:id',
			name: 'detail',
			component: () => import('@/views/DetailView.vue')
		}
	]
})

async function canUserAccess(to: Route) {
	const authenticationConfig = await getAuthenticationConfig()
	const { response } = authenticationConfig
	const {
		body: { resAuthTokenField }
	} = response

	const auth = get(types.AUTH) || {}
	return to.name === 'login' || !!auth[resAuthTokenField]
}

router.beforeEach(async (to, from, next) => {
	const canAccess = await canUserAccess(to)
	if (!canAccess) next({ name: 'login' })
	else next()
})

export default router
