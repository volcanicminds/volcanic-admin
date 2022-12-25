type StoreSource = { [key: string]: ConfigSourceModel }
type ConfigSourceModelColumns = { [key: string]: FieldModel }
interface ConfigSourceModel {
	columns: ConfigSourceModelColumns
	table?: {
		pagination?: {
			pageSize: number
		}
		rowMenu?: TableOptionsMenuItems
	}
}

type FieldModelType = 'number' | 'date' | 'text' | 'boolean'

interface FieldModel {
	type: FieldModelType
	input: Input
	table?: {
		cell?: {
			format?: function | string
			isLink?: boolean
		}
		visible?: boolean
		width?: string | number
		sorting?: TableSorting
		filtering?: TableFiltering
	}
	isKey?: boolean
	specifications?: { subtype: 'currency' | 'datetime' | 'multiple'; symbol?: string }
}

interface TableSorting {
	enabled: boolean
	subField?: string
	default?: 'asc' | 'desc'
}

interface TableFiltering {
	enabled: boolean
	operator:
		| 'between' //case with 2 values
		| 'in' //array case, with 2+ value
		| 'nin' //array case, with 2+ value
		| 'eq'
		| 'neq'
		| 'eqi'
		| 'neqi'
		| 'gt'
		| 'ge'
		| 'lt'
		| 'le'
		| 'starts'
		| 'ends'
		| 'startsi'
		| 'endsi'
		| 'like'
		| 'contains'
		| 'ncontains'
		| 'likei'
		| 'containsi'
		| 'ncontainsi'
		| 'null'
		| 'notNull'
	defaultValues?: Array<string | number | boolean>
	subField?: string
}

interface Input {
	type: 'autocomplete' | 'select' | 'input' | 'calendar' | 'textarea'
	condition?: {
		field: string
		operator: 'eq' | 'neq' | 'lt' | 'lte' | 'mt' | 'mte'
		value: string | number | boolean
	}
	label?: LocalizedItemField
	defaultValue?: LocalizedItemField
	readonly?: boolean
	disabled?: boolean
	scope?: 'create' | 'update' | 'all'
	hidden?: boolean
	source?: string | 'static'
	filters?: { [key: string]: string }
	sorting?: { [key: string]: 'ASC' | 'DESC' }
	data?: ApiResponseBody
	dataOptions?: {
		value: string
		label: string | Array<string>
	}
	options?: {
		style?: string
		format?: string
		validation?: Validation
		layout?: Layout
	}
}

interface Layout {
	tab?: {
		title?: string
	}
}

interface ModelSouceData {
	[key: string]: ApiResponseBody
}

interface Validation {
	methods?: modelRuleMethods
	value?: string | number
}

type modelRuleMethods = Array<modelRuleMethod>

type modelRuleMethod =
	| 'alpha'
	| 'alpha_dash'
	| 'alpha_num'
	| 'alpha_spaces'
	| 'between'
	| 'confirmed'
	| 'digits'
	| 'dimensions'
	| 'email'
	| 'excluded'
	| 'ext'
	| 'image'
	| 'oneOf'
	| 'integer'
	| 'is'
	| 'is_not'
	| 'length'
	| 'max'
	| 'max_value'
	| 'mimes'
	| 'min'
	| 'min_value'
	| 'numeric'
	| 'regex'
	| 'required'
	| 'required_if'
	| 'size'
	| 'double'
