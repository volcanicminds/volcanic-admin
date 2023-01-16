[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![opensource](https://img.shields.io/badge/open-source-blue)](https://en.wikipedia.org/wiki/Open_source)
[![volcanic-admin](https://img.shields.io/badge/volcanic-minds-orange)](https://github.com/volcanicminds/volcanic-admin)
[![npm](https://img.shields.io/badge/package-npm-white)](https://www.npmjs.com/package/@volcanicminds/admin)

# volcanic-admin

## Based on

Based on [Vite](https://vitejs.dev/) ([GitHub](https://github.com/vitejs/vite)).
Based on [Pinia](https://pinia.vuejs.org/) ([GitHub](https://github.com/vuejs/pinia)).
Based on [Vuetify](https://vuetifyjs.com/en/) ([GitHub](https://github.com/vuetifyjs/vuetify)).
Based on [Vue Easytable](https://happy-coding-clans.github.io/vue-easytable/#/en/demo) ([GitHub](https://github.com/Happy-Coding-Clans/vue-easytable)).
Based on [Vee Validate](https://vee-validate.logaretm.com/v3/) ([GitHub](https://github.com/logaretm/vee-validate)).

And what you see in [package.json](package.json).

Best to be used coupled with
[Volcanic Backend](https://www.npmjs.com/package/@volcanicminds/backend) ([GitHub](https://github.com/volcanicminds/volcanic-backend)).

## How to install

```ts
yarn add @volcanicminds/admin
```

## Environment (example)

```ruby
VITE_API_BASE_URL = http://0.0.0.0:2230
```

## How to run

```ts
yarn dev
yarn build //to build for production, with type check
yarn build-no-type-check //to build for production, without type check
```

## The philosophy behind the project

We wanted to develope a super easy and super fast to configure admin panel.
To start you have to configure 2 files:

- configuration/menu.ts
- configuration/rest.default.ts

and you are good to go.
There is also a user page to change the user password.

But you would miss all the fun!

The Admin is thought to be used as a desktop web app, but there is a simplified table support if the web app is loaded on a phone device.

## Localization

The project is localized in 3 languages: English, Italian and German.
The configuration files can be optionally localized as described for every specific section.

## menu.ts

```ts
type Menu = Array<MenuItem>
interface MenuItem {
	label:
		| string
		| {
				[language: string]: string
		  }
	name: string | null
	source: string | null
	icon?: string
	isDefault?: boolean
	filters?: TableFiltersParams
	sorting?: TableSortingParams
	pagination?: TablePaginationParams
	operation?: () => void
}
```

The fields _label_, _name_ and _source_ are the bare minimum for the menu.

- **label** is the string that the user will see in the menu. The label can be localized,
  ex:
  ```ts
  {
  	en: 'My Label',
  	it: 'La mia etichetta',
  	de: 'Mein Etikett'
  }
  ```
- **name** is the identifier for the scope, as we will see, you can have more menu items for a single data source
- **source** describes the name of the data source. If your api is GET: <server url>/cocktails -> to get all the cocktails on the DB, then the _source_ you have to set is "cocktails".

### Additional menu item fields

**icon** is the name of the [Material Design](https://fonts.google.com/icons?selected=Material+Icons) you want to pair with the menu item, the name must be written so that is compatible with Vuetify specifications.
**isDefault** sets the page linked by that menu item as the default landing page.
**filters** lets you pre-filter the data source, the structure is:

```ts
Array<{
	key: string
	operator: string
	value: ApiGenericValue
}>
```

where **key** is the field you want to filter for, **operator** is the filter operator (it depends on your apis), **value** is the value you want to filter for (boolean, string or number).
**sorting** lets you pre-sort the data source, the structure is

```ts
{
   [key:string]: string
}
```

**pagination** lets you pre-paginate the data source, the structure is

```ts
{
	pageIndex?: number
	pageSize?: number
}
```

**operation** is a function you can trigger on menu item press, it is executed in case the _source_ field has no value.

## rest.default.ts

```ts
{
   remapResponse: function (source: string, data: ApiResponseBody) {}
   remapSource: function ({ filters, sorting, pagination }: TableRoutingParams) {}
}
```

**remapResponse** is used to change the response in case they are not standard CRUD responses.
Should always return

```ts
return data
```

where the **data** variable is the data you want to send back to the table or detail page.
The expected data are:

- from a _count_ the table expects a number
- from a _find_ the table expects an array of objects
- from a _findOne_ the detail page expects an object
- from a _update_ the table expects an object
- from a _delete_ the table expects an object

**remapSource** is used to translate the parameters coming from the volcanic admin table so that could be executed by your backend server. Should always return

```ts
return encodeURI(url)
```

where the **url** variable is the url you want to call your backend with.

## brand.ts

```ts
interface ConfigurationCompany {
	name?: string
	logo?: string
	logo_alt?: string
}
```

You can use this file to configure the branding of your admin panel.
**name** it should be the name of your company or project. It is used as a title tag for the logo image.
**logo** is the name of the image file to be linked by a "img" tag for the light theme.
**logo_alt** is the name of the image file to be linked by a "img" tag for the dark theme.

## authentication.ts

```ts
interface Authconfiguration {
	request: {
		body: { reqEmailField: string; reqPasswordField: string }
		url: string
		method: 'POST' //for now only POST is supported
	}
	response: {
		body: {
			resEmailField: string
			resAuthTokenField: string
			resRolesField: string
		}
	}
}
```

This is the object you can configure to manage the authentication.
Authentication is set by default, with default fields.
An example configuration is:

```ts
const authenticationConfig = {
	request: {
		body: { reqEmailField: 'username', reqPasswordField: 'password' },
		url: '/auth/login',
		method: 'POST'
	},
	response: {
		body: {
			resEmailField: 'email',
			resAuthTokenField: 'token',
			resRolesField: 'roles'
		}
	}
}

export default authenticationConfig
```

## sources/<source name>.ts

```ts
interface ConfigSourceModel {
	columns: {
		[key: string]: {
			type: 'number' | 'date' | 'text' | 'boolean'
			input: {
				type: 'autocomplete' | 'select' | 'input' | 'calendar' | 'textarea'
				condition?: {
					field: string
					operator: 'eq' | 'neq' | 'lt' | 'lte' | 'mt' | 'mte'
					value: string | number | boolean
				}
				label?:
					| string
					| {
							[language: string]: string
					  }
				defaultValue?:
					| string
					| boolean
					| number
					| {
							[language: string]: string
					  }
				readonly?: boolean
				disabled?: boolean
				scope?: 'create' | 'update' | 'all'
				hidden?: boolean
				source?: string | 'static'
				filters?: { [key: string]: string }
				sorting?: { [key: string]: 'ASC' | 'DESC' }
				isKey?: boolean
				specifications?: {
					subtype: 'currency' | 'datetime' | 'multiple'
					symbol?: string
				}
				data?:
					| number
					| {
							[field: string]: any
					  }
					| Array<{
							[field: string]: any
					  }>
				dataOptions?: {
					value: string
					label: string | Array<string>
				}
				options?: {
					style?: string
					format?: string
					validation?: {
						methods?: Array<
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
						>
						value?: string | number
					}
					layout?: {
						tab?: {
							title?: string
						}
					}
				}
				table?: {
					cell?: {
						format?: Function | string
						isLink?: boolean
					}
					visible?: boolean
					width?: string | number
					sorting?: {
						enabled: boolean
						subField?: string
						default?: 'asc' | 'desc'
					}
					filtering?: {
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
				}
			}
		}
	}
	layout?: {
		tabs?: {
			[name: string]: {
				title:
					| string
					| number
					| boolean
					| {
							[language: string]: string | number | boolean
					  }
			}
		}
	}
	table?: {
		pagination?: {
			pageSize: number
		}
		options?: {
			canDelete?: boolean
			checkbox?: boolean
		}
		rowMenu?: [
			{
				title:
					| string
					| number
					| boolean
					| {
							[language: string]: string | number | boolean
					  }
				requiresConfirmation: boolean
				delete?: boolean
				operation?: (value: any) => void
			}
		]
		customColumns?: Array<{
			title?:
				| string
				| number
				| boolean
				| {
						[language: string]: string | number | boolean
				  }
			align?: 'center' | 'left' | 'right'
			position: number
			customComponent: JSXComponent
		}>
	}
}
```

This is the source configuration.
The _input_ field has 3 optionally localized fields: _label_, _defaultValue_ and the _title_ of the _layout_ configuration. The syntax is, in case you want to change the value fo these fields based on locale language, is:

```ts
{
	label: {
		en: 'Name',
		it: 'Nome',
		de: 'Vorname'
	},
	defaultValue: {
		en: '+1',
		it: '+39',
		de: '+49'
	}
}
```

There are 2 levels of configuration:

- **fully automatic** in which you just set the "menu.ts" and "rest.default.ts" files, in this case the table shows every field and the detail page too, considering every field as required of a string type.
- **configured** in which you have to set a sources/<my-source>.ts file.

**columns** is an Object, every Key should be equal to the **source** which is the name of the file and value of the **source** field of the menu.ts .
For every _column_ you set the _type_ and _input_. The _table_ configuration could be set to configure globally the table, for pagination and to configure the _menu_ button on every row.
The _menu_ button can be configured with a **title**, a **requiresConfirmation** to request the user a confirmation before executing the operation and an **operation** custom function, if the **delete** is set to "true", the **operation** function is ignored and the standard "delete" endpoint is called passing the row id.

The _input_ field is the most complex and it lets you set both the behavior of the single input inside the detail page and the column and cell inside the table.
Many sub-fields are self explicable, we are going to explain the most peculiar ones:

- **isKey** configures the field as the database key, useful to be used with updates, findOnes and deletes. The default key is the field with value "id".
- **specifications** configures some specific implementations of the input components, the sub fields are:
  - **subtype** which allows you to set the field to be treated as a "currency" (in this case the subfield "symbos" is considered), "datetime" to allow the "calendar" input to show both days and time and "multiple" for "autocomplete" and "select" inputs to let the user choose multiple values.
  - **symbol** is the symbol used in case of the **subtype** is set to "currency".
- **condition** sets a condition for the visibility of the input inside the detail page, the value of the field is checked through the operator and value, so that if row[field] <operator> value === true then the input will be shown. If there is now condition set, the input will be always shown.
- **scope** defines if the input should be shown in update, create or always. The default value is "all".
- **options** has sub options:
  - **style** to set a custom styling
  - **format** a string to format a value (for now only for dates)
  - **validation** is set to configure the validation, the default is "required", the sub fields are:
    - **methods** is an array of [vee-validate rules](https://vee-validate.logaretm.com/v2/guide/rules.html)
    - **value** is a value to be compared to

Fields to configure the options of "select" and "autocomplete" inputs are:

- **source** is the endpoint to call to populate the list of the options, should be set to "static" to apply the _data_ field as a static list of options
- **data** is the static list of options to apply
- **dataOptions** configures the "value" and "label" keys to match the single item of the values returned calling the "source" endpoint
- **filters** and **sorting** are the filters and sorting configuration applied when calling the "source" enpoint

The _table_ field inside the _input_ configuration, configures the behavior of the column and single cell inside the table.

- **cell** sets the cell configuration with 2 sub fields:
  - **format** could be a function or a string to format the data before showing it to the user, the string is use to format "boolean" and "date" fields.
  - **isLink** sets the cell as a link, useful in case of relation fields
- **sorting** and **filtering** are set to configure the default parameters to apply to the column, you can apply only 1 filter per column.
  - **subField** is the field to check inside a relation field, ex: &sort:cocktail._ingredient_=asc .
  - **enable** you can use this field to disable sorting or filtering for that column, they are _true_ by default.
  - **defaultValues** are the default values to be set for the filter, it is an array to be used in caso of "between", "in" or "nin" operator values.
  - **operator** are a self explicable list of operators to filter the column with.

The _table_ base field lets you to configure the table in the whole.

- **pagination**: has the **_pageSize_** field and it configures the pageSize of the table.
- **options**: has the **_canDelete_** field to show the options to delete the rows and **_checkbox_** field, to enable the multi selection.
- **rowMenu**: is an array of object, the object has the **_title_** which is a localized label, the **_requiresConfirmation_** which configures the need to ask for a user confirmation before starting the operation or delete, the **_delete_** option, which tells that you need to perform a delete, in this case the operation field is not executed, the **_operation_** field which is a custom function that will be executed.
- **customColumns**: is an array of object, the object has the **_title_** which is a localized label, the **_align_** field, which sets the alignment inside the cell, **_position_** which is the number of the column, the count of the column starts from 0, **_customComponent_** which is a custom JSX component.

### Layout configuration for the detail view

You can configure 2 types of layout

- **default**: in this case you'll get a simple list of imputs in a single column, but you don't have to do anything special
- **tabs**: for this configuration you can organize the inputs in tabs, every input must be associated to a _options_._layout_._name_ value that is matched with the _layout_._tabs_ keys. The tabs _title_ can be translated.
