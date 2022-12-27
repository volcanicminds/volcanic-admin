type RenderingStrategy = 'default' | 'configured'

type UrlsFromInputWithSources = {
	[key: string]: any
}

interface DetailLayout {
	type: 'default' | 'tabs'
	tabs: {
		[tab: string]: {
			title: string
			inputNames: Array<string>
		}
	}
}
