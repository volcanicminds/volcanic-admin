import { defineAdminPlugin } from '@volcanicminds/admin'
import { RatingWidget } from '../widgets/RatingWidget'
import { VehicleShow } from '../views/VehicleShow'

/** Catalog customizations: a custom field widget + a custom show screen. */
export const catalogPlugin = defineAdminPlugin({
  name: 'catalog',
  widgets: { rating: RatingWidget }, // manifest field.form.widget === "rating"
  views: { 'vehicle-show': VehicleShow } // manifest views.show === "vehicle-show"
})
