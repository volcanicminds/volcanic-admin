const menu: Menu = [
	{
		label: 'All Customers',
		icon: 'people',
		name: 'customers_default',
		source: 'customers',
		filters: [],
		sorting: {},
		pagination: {}
	},
	{
		label: 'Paying customers',
		icon: 'adjust',
		source: 'customers',
		name: 'paying_customers',
		filters: [
			{
				key: 'paying',
				operator: 'eq',
				value: true
			}
		],
		sorting: { name: 'asc' },
		pagination: { pageSize: 25 }
	}
]

export default menu
