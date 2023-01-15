import { getTranslatedItem } from '@/utils/locale'
import { getIdField } from '@/utils/model'

function getInitialValue(
	dataValue: any,
	model: ConfigSourceModelColumns,
	key: string
): string | number | boolean | Array<any> {
	if (dataValue != null) {
		if (typeof dataValue === 'object') {
			const idFieldKey = getIdField(model)
			if (dataValue instanceof Array) {
				return dataValue.map((dv) => dv[idFieldKey])
			} else {
				return dataValue[idFieldKey]
			}
		}

		return dataValue
	}

	return getTranslatedItem(model[key].input?.defaultValue as LocalizedItemField)
}
export { getInitialValue }
