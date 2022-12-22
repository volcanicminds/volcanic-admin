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

	return model[key].input?.defaultValue
}

export { getInitialValue }
