function getLocaleLanguage() {
	return navigator.language.slice(0, 2).toLowerCase()
}

function getTranslatedItem(item: LocalizedItemField) {
	if (typeof item === 'object') {
		const localeLanguage = getLocaleLanguage()
		return item[localeLanguage]
	}

	return item
}

export { getLocaleLanguage, getTranslatedItem }
