//For now only full mode is supported
type TablesStrategies = 'full' | 'infinite-scroll' | 'virtual-pagination'

//For now only synced mode is supported
type UpdatesStrategies = 'synced' | 'optimistic'

//For now only light theme is supported
type BaseThemes = 'light' | 'dark'
type Themes = BaseThemes | string

interface LocaleLabel {
	[language: string]: string
}
