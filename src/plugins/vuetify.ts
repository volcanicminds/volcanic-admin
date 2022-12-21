import 'material-design-icons-iconfont/dist/material-design-icons.css'
import Vue from 'vue'
import Vuetify, {
	VTabs,
	VTab,
	VTextField,
	VTabsItems,
	VTabItem,
	VCard,
	VCardActions,
	VCardText,
	VMain,
	VList,
	VNavigationDrawer,
	VListItem,
	VListItemContent,
	VDatePicker,
	VBtn,
	VDialog,
	VSpacer,
	VListItemTitle,
	VListItemIcon,
	VIcon,
	VAppBar,
	VApp,
	VAppBarNavIcon,
	VAutocomplete,
	VDivider,
	VSheet,
	VSelect,
	VCheckbox,
	VContainer,
	VTextarea,
	VListItemSubtitle,
	VExpandTransition
} from 'vuetify/lib'

Vue.use(Vuetify, {
	icons: {
		iconfont: 'md'
	},
	theme: { dark: false },
	components: {
		VTabs,
		VTab,
		VTextField,
		VTabsItems,
		VTabItem,
		VAutocomplete,
		VCheckbox,
		VCardActions,
		VContainer,
		VSheet,
		VMain,
		VDivider,
		VAppBar,
		VCard,
		VCardText,
		VExpandTransition,
		VNavigationDrawer,
		VList,
		VListItem,
		VListItemIcon,
		VListItemTitle,
		VListItemSubtitle,
		VListItemContent,
		VDatePicker,
		VDialog,
		VBtn,
		VSpacer,
		VIcon,
		VAppBarNavIcon,
		VApp,
		VTextarea,
		VSelect
	}
})

export default new Vuetify({})
