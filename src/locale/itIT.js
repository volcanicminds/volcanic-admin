const _default = {
	pagination: {
		goto: 'Vai',
		page: '',
		itemsPerPage: ' / pagina',
		total: function total(_total) {
			return 'Totale ' + _total
		},
		prev5: 'Precedenti 5 pagine',
		next5: 'Prossime 5 pagine'
	},
	table: {
		confirmFilter: 'Conferma',
		resetFilter: 'Reset',
		cut: 'Taglia',
		copy: 'Copia',
		insertRowAbove: 'Inserisci una riga sopra',
		insertRowBelow: 'Inserisci una riga sotto',
		removeRow: 'Rimuovi $1 riga',
		emptyRow: 'Svuota $1 riga',
		emptyColumn: 'Svuota $1 colonna',
		emptyCell: 'Svuota cella',
		leftFixedColumnTo: 'Sinistra colonna fissata a',
		cancelLeftFixedColumnTo: 'Annulla sinistra colonna fissata a',
		rightFixedColumnTo: 'Destra colonna fissata a',
		cancelRightFixedColumnTo: 'Annulla destra colonna fissata a'
	}
}

export default _default
