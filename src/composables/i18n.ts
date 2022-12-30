/**
 * Adapted from https://github.com/intlify/vue-i18n-composable/tree/master/src
 * This is temporary to allow us to use VueI18n 8.x with the Composition API and Vue 2
 * Once we upgrade to Vue 3 (which allows an upgrade to VueI18n 9.x), we can remove this
 * in favor of VueI18n's useI18n() hook
 */

import { computed, getCurrentInstance } from 'vue'
import Vue from 'vue'
import VueI18n from 'vue-i18n'

const i18nInstance = VueI18n

export function useI18n() {
	if (!i18nInstance) throw new Error('vue-i18n not initialized')

	const i18n: any = i18nInstance

	const instance = getCurrentInstance()
	const vm = instance?.proxy || instance || (new Vue({}) as any)

	const locale = computed({
		get() {
			return i18n.locale
		},
		set(v) {
			i18n.locale = v
		}
	})

	return {
		locale,
		t: vm.$t.bind(vm),
		tc: vm.$tc.bind(vm),
		d: vm.$d.bind(vm),
		te: vm.$te.bind(vm),
		n: vm.$n.bind(vm)
	}
}
