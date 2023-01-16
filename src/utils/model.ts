export async function loadModel(source: string) {
	let sourceModel = null
	try {
		sourceModel = await import(`@/configuration/sources/${source}.ts`)
	} catch (e) {
		console.warn('Configuration model missing')
	}
	return sourceModel?.default || {}
}

export const DEFAULT_ID_FIELD = 'id'

export function getIdField(model: ConfigSourceModelColumns) {
	const field = Object.keys(model).find((k) => model[k].isKey)
	if (!field) {
		return DEFAULT_ID_FIELD
	}

	return field
}
