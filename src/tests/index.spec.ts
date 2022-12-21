import Vue from 'vue'
import apiTests from './store/api.spec'
import configurationTests from './store/configuration.spec'
import tablesTests from './store/tables.spec'
import userTests from './store/user.spec'

class LocalStorageMock {
	store: any
	constructor() {
		this.store = {}
	}

	clear() {
		this.store = {}
	}

	getItem(key: string) {
		return this.store[key] || null
	}

	setItem(key: string, value: string) {
		this.store[key] = String(value)
	}

	removeItem(key: string) {
		delete this.store[key]
	}
}

describe('Tests', () => {
	beforeAll(() => {
		;(global as any).localStorage = new LocalStorageMock()
		Vue.prototype.$axios = () => ({ data: {} })
	})
	describe('Api', () => {
		apiTests()
	})
	describe('Configuration', () => {
		configurationTests()
	})
	describe('Tables', () => {
		tablesTests()
	})
	describe('User', () => {
		userTests()
	})
})
