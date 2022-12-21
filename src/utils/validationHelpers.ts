function getModelRules(validation: Validation) {
	const modelRules = validation?.methods || []
	const mappedModelRules = modelRules
		.map((modelRule) => {
			const modelRuleValue = validation?.value
			if (modelRuleValue) {
				return `${modelRule}:${modelRuleValue}`
			}

			return modelRule
		})
		.join('|')

	return mappedModelRules
}

export { getModelRules }
