<template>
	<div class="pa-2 my-3">
		<v-btn block @click="logout"> {{ $t('authentication.logout') }} </v-btn>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { VBtn } from 'vuetify/lib'
import { useUserStore } from '@/stores/user'
import router from '@/router'

export default defineComponent({
	name: 'PageMenuLogout',
	methods: {
		logout: function () {
			{
				const user = useUserStore()
				user.logout()

				router.push('/login')
			}
		}
	}
})
</script>
