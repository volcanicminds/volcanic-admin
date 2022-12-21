export function remapSortingParams(sorting: ApiGetSort = {}) {
	const remappedSorting = {} as ApiGetSort

	Object.keys(sorting).forEach((key, index) => {
		remappedSorting[`sort${index}`] = key
		remappedSorting[`order${index}`] = sorting[key]
	})

	return remappedSorting
}
