import { defineAdminPlugin } from '@volcanicminds/admin'
import { Dashboard } from '../pages/Dashboard'

/** Adds a landing dashboard page + its sidebar entry and labels. */
export const dashboardPlugin = defineAdminPlugin({
  name: 'dashboard',
  routes: [
    {
      path: '/dashboard',
      element: <Dashboard />,
      index: true,
      nav: { label: 'nav.dashboard', icon: 'layers', order: 0 }
    }
  ],
  dictionaries: {
    it: { 'nav.dashboard': 'Dashboard' },
    en: { 'nav.dashboard': 'Dashboard' }
  }
})
