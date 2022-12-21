export async function loadModel(source: string) {
	let sourceModel = null
	try {
		sourceModel = await import(`@/configuration/sources/${source}.ts`)
	} catch (e) {
		console.warn('Configuration model missing')
	}
	return sourceModel?.default || {}
}
