const _default = {
	pagination: {
		goto: 'Gehen',
		page: '',
		itemsPerPage: ' / Seite',
		total: function total(_total) {
			return 'Insgesamt ' + _total
		},
		prev5: 'Vorherige 5 Seiten',
		next5: 'Die nächsten 5 Seiten'
	},
	table: {
		confirmFilter: 'Bestätigung',
		resetFilter: 'Reset',
		cut: 'Schnitt',
		copy: 'Kopieren',
		insertRowAbove: 'Fügen Sie oben eine Zeile ein',
		insertRowBelow: 'Bitte fügen Sie unten eine Zeile ein',
		removeRow: 'Entfernen Sie $1 Zeile',
		emptyRow: 'Leere $1 Zeile',
		emptyColumn: 'Löschen Sie die Spalte $1',
		emptyCell: 'Leere Zelle',
		leftFixedColumnTo: 'Linke Spalte fixiert auf',
		cancelLeftFixedColumnTo: 'Rückgängig machen linke Spalte fixiert auf',
		rightFixedColumnTo: 'Rechte Spalte fixiert',
		cancelRightFixedColumnTo: 'Rückgängig machen der rechten Spalte fixiert auf'
	}
}

export default _default
