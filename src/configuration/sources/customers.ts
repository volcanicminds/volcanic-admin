const model: ConfigSourceModel = {
	columns: {
		id: {
			isKey: true,
			type: 'text',
			input: {
				type: 'input',
				hidden: true,
				options: {
					layout: {
						tab: {
							name: 'personalinformation'
						}
					}
				}
			},
			table: {
				visible: false
			}
		},
		firstName: {
			type: 'text',
			input: {
				type: 'input',
				label: {
					en: 'Name',
					it: 'Nome',
					de: 'Vorname'
				},
				options: {
					validation: {
						methods: ['required']
					},
					layout: {
						tab: {
							name: 'personalinformation'
						}
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
					},
					layout: {
						tab: {
							name: 'personalinformation'
						}
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
					},
					layout: {
						tab: {
							name: 'personalinformation'
						}
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
				defaultValue: {
					en: '+1',
					it: '+39',
					de: '+49'
				},
				options: {
					validation: {
						methods: ['required']
					},
					layout: {
						tab: {
							name: 'personalinformation'
						}
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
					},
					layout: {
						tab: {
							name: 'personalinformation'
						}
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
					},
					layout: {
						tab: {
							name: 'personalinformation'
						}
					}
				}
			},
			table: {
				cell: {
					format: 'DD/MM/YYYY'
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
					},
					layout: {
						tab: {
							name: 'address'
						}
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
					},
					layout: {
						tab: {
							name: 'address'
						}
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
					},
					layout: {
						tab: {
							name: 'address'
						}
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
					},
					layout: {
						tab: {
							name: 'address'
						}
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
					},
					layout: {
						tab: {
							name: 'address'
						}
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
	layout: {
		tabs: {
			personalinformation: {
				title: {
					en: 'Personal information',
					it: 'Informazioni personali',
					de: 'Persönliche Informationen'
				}
			},
			address: {
				title: 'Address'
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
