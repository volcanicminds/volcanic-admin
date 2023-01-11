interface PluginLocaleConfiguration {
	[k: string]: {
		validation: any
		table: any
	}
}

interface LocaleMessages {
	[lang: string]: { [group: string]: { [message: string]: string } }
}
