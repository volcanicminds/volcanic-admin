<template>
	<div class="flex justify-center" style="height: 100%">
		<div class="self-center">
			<h1 class="h1">{{ $t('authentication.login') }} - {{ companyName }}</h1>
			<ValidationObserver ref="login" v-slot="{ invalid }">
				<form @submit.prevent="onSubmit">
					<div>
						<ValidationProvider v-slot="{ errors }" name="Email" rules="required|email">
							<div>
								<label :for="email">{{ $t('authentication.email') }}</label>
							</div>
							<v-text-field v-model="email" name="email" type="email" placeholder="Email" />
							<p>{{ errors[0] }}</p>
						</ValidationProvider>
					</div>
					<div>
						<ValidationProvider v-slot="{ errors }" name="Password" rules="required">
							<div>
								<label :for="password">{{ $t('authentication.password') }}</label>
							</div>
							<v-text-field v-model="password" name="password" type="password" placeholder="Password" />
							<p>{{ errors[0] }}</p>
						</ValidationProvider>
					</div>
					<v-btn type="submit" :disabled="invalid">{{ $t('general.confirm') }}</v-btn>
				</form>
			</ValidationObserver>
		</div>
	</div>
</template>

<script lang="ts">
import { extend, ValidationObserver, ValidationProvider } from 'vee-validate'
import { required, email } from 'vee-validate/dist/rules'
import { useUserStore } from '@/stores/user'
import menu from '@/configuration/menu'
import { useConfigurationStore } from '@/stores/configuration'

extend('email', email)
extend('required', required)

export default {
	data: () => ({
		email: '',
		password: '',
		companyName: '',
		observer: null as any
	}),
	mounted() {
		this.observer = this.$refs.login as InstanceType<typeof ValidationObserver>
		const store = useUserStore()
		this.email = store.email

		const configStore = useConfigurationStore()
		this.companyName = configStore.company?.name || 'BRAND'
	},
	methods: {
		onSubmit: async function () {
			const userStore = useUserStore()
			await userStore.login(this.email, this.password)

			this.email = this.password = ''
			this.observer.reset()

			const defaultMenuSource = menu.find((item) => item.isDefault)
			this.$router.push(`/${defaultMenuSource?.name || ''}`)
		}
	}
}
</script>
