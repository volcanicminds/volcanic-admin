import type { Dictionaries } from '@volcanicminds/admin'

/**
 * Translations for the manifest keys your backend emits:
 *   res.<name>.{singular,plural}, field.<resource>.<field>,
 *   enum.<EnumName>.<value>, group.<name>, action.<resource>.<action>.
 * Missing keys fall back to a humanized label, so you can fill these in over time.
 */
export const dictionaries: Dictionaries = {
  it: {
    'group.catalog': 'Catalogo',
    'res.product.plural': 'Prodotti',
    'res.product.singular': 'Prodotto',
    'field.product.name': 'Nome',
    'field.product.price': 'Prezzo'
  },
  en: {
    'group.catalog': 'Catalog',
    'res.product.plural': 'Products',
    'res.product.singular': 'Product'
  }
}
