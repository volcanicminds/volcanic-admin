<template>
	<div class="py0 px3">
		<h1>{{ $t('authentication.userViewTitle') }}</h1>

		<ValidationObserver v-slot="{ invalid }">
			<form @submit.prevent="onSubmit">
				<div>
					<ValidationProvider v-slot="{ errors }" name="Email" rules="required|email">
						<div>
							<label :for="email">{{ $t('authentication.email') }}</label>
						</div>
						<v-text-field v-model="email" name="email" type="email" :placeholder="$t('authentication.email')" />
						<p>{{ errors[0] }}</p>
					</ValidationProvider>
				</div>
				<div>
					<ValidationProvider v-slot="{ errors }" vid="password" name="Password" rules="required">
						<div>
							<label :for="password">{{ $t('authentication.password') }}</label>
						</div>
						<v-text-field
							v-model="password"
							name="password"
							type="password"
							:placeholder="$t('authentication.password')"
						/>
						<p>{{ errors[0] }}</p>
					</ValidationProvider>
				</div>
				<div>
					<ValidationProvider v-slot="{ errors }" name="password_confirmation" rules="required|confirmed:password">
						<div>
							<label :for="confirmation">{{ $t('authentication.repeatPassword') }}</label>
						</div>
						<v-text-field
							v-model="confirmation"
							name="password_confirmation"
							type="password"
							:placeholder="$t('authentication.repeatPassword')"
						/>
						<p>{{ errors[0] }}</p>
					</ValidationProvider>
				</div>
				<v-btn type="submit" :disabled="invalid" color="primary">{{ $t('general.update') }}</v-btn>
			</form>
		</ValidationObserver>
		<br />
		<v-btn color="error" @click="logout()">{{ $t('authentication.logout') }}</v-btn>
	</div>
</template>

<script lang="ts">
import Vue from 'vue'
import { extend, ValidationObserver, ValidationProvider } from 'vee-validate'
import { required, email, confirmed } from 'vee-validate/dist/rules'
import { defineComponent, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import * as api from '@/utils/apiInternalInterface'
import router from '@/router'

extend('email', email)
extend('required', required)
extend('confirmed', confirmed)

export default defineComponent({
	setup() {
		const store = useUserStore()
		const { email: _email } = storeToRefs(store)
		const { logout: _logout } = store

		const email = ref(_email)
		const password = ref('')
		const confirmation = ref('')
		const id = ref('')

		function onSubmit() {
			try {
				api.update('users', id.value, {
					email: email.value,
					password: password.value
				})
			} catch (e) {
				console.error('Error during users update', e)

				Vue.$toast.open({
					message: this.$t('toasts.cannotUpdateUser'),
					type: 'error',
					position: 'bottom'
				})
			}
		}

		function logout() {
			_logout()

			router.push('/login')
		}
		return {
			email,
			password,
			confirmation,
			onSubmit,
			logout
		}
	}
})
</script>
