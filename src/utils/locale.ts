function getLocaleLanguage() {
	return navigator.language.slice(0, 2).toLowerCase()
}

export { getLocaleLanguage }
