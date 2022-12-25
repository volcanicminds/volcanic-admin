import { getTranslatedItem } from '@/utils/locale'

function getInitialValue(dataValue: any, model: ConfigSourceModelColumns, key: string) {
	if (dataValue != null) {
		if (typeof dataValue === 'object') {
			const idFieldKey = Object.keys(model).find((m) => model[m].isKey)
			if (idFieldKey) {
				return dataValue[idFieldKey]
			}

			return dataValue['id']
		}

		return dataValue
	}

	return getTranslatedItem(model[key].input?.defaultValue as LocalizedItemField)
}

export { getInitialValue }
