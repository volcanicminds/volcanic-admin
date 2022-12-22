const model: ConfigSourceModel = {
	columns: {
		id: {
			isKey: true,
			type: 'text',
			input: {
				type: 'input',
				hidden: true
			},
			table: {
				visible: false
			}
		},
		firstName: {
			type: 'text',
			input: {
				type: 'input',
				label: 'Name',
				options: {
					validation: {
						methods: ['required']
					}
				}
			}
		},
		lastName: {
			type: 'text',
			input: {
				type: 'input',
				label: 'Lastname',
				options: {
					validation: {
						methods: ['required']
					}
				}
			}
		},
		email: {
			type: 'text',
			input: {
				type: 'input',
				label: 'Email',
				options: {
					validation: {
						methods: ['required', 'email']
					}
				}
			},
			table: {
				sorting: {
					enabled: true,
					default: 'asc'
				}
			}
		},
		phonePrefix: {
			type: 'text',
			input: {
				type: 'input',
				label: 'Prefix',
				defaultValue: '+39',
				options: {
					validation: {
						methods: ['required']
					}
				}
			},
			table: {
				visible: false
			}
		},
		phone: {
			type: 'number',
			input: {
				type: 'input',
				label: 'Phone',
				options: {
					validation: {
						methods: ['numeric', 'required']
					}
				}
			},
			table: {
				sorting: {
					enabled: true
				}
			}
		},
		birthDate: {
			type: 'date',
			input: {
				type: 'input',
				label: 'Birthdate',
				options: {
					format: 'DD-MM-YYYY',
					validation: {
						methods: ['required']
					}
				}
			}
		},
		residenceCountry: {
			type: 'text',
			input: {
				type: 'input',
				label: 'Country of residence',
				defaultValue: 'Italia',
				options: {
					validation: {
						methods: ['required']
					}
				}
			},
			table: {
				visible: false
			}
		},
		residenceAddress: {
			type: 'text',
			input: {
				type: 'input',
				label: 'Address of residence',
				options: {
					validation: {
						methods: ['required']
					}
				}
			},
			table: {
				visible: false
			}
		},
		residenceZipCode: {
			type: 'text',
			input: {
				type: 'input',
				label: 'Zipcode of residence',
				options: {
					validation: {
						methods: ['required']
					}
				}
			},
			table: {
				visible: false
			}
		},
		residenceProvince: {
			type: 'text',
			input: {
				type: 'input',
				label: 'County of residence',
				options: {
					validation: {
						methods: ['required']
					}
				}
			},
			table: {
				visible: false
			}
		},
		residenceCity: {
			type: 'text',
			input: {
				type: 'input',
				label: 'City of residence',
				options: {
					validation: {
						methods: ['required']
					}
				}
			},
			table: {
				visible: false
			}
		},
		newsletter: {
			type: 'boolean',
			input: {
				label: 'Has accepted the newsletter',
				type: 'input'
			},
			table: {
				visible: false
			}
		},
		marketing: {
			type: 'boolean',
			input: {
				label: 'Has accepted the marketing flag',
				type: 'input'
			},
			table: {
				visible: false
			}
		}
	},
	table: {
		rowMenu: [
			{
				title: 'Delete',
				requiresConfirmation: true,
				delete: true
			}
		]
	}
}

export default model
