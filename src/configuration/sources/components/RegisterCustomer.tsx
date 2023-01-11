import * as api from '@/utils/apiInternalInterface'
import { getIdField } from '@/utils/model'
import i18n from '@/locale/i18n'

function RegisterComponent({ row, model }: { row: Row; model: ConfigSourceModelColumns }) {
	//source: https://stackoverflow.com/questions/70706563/javascript-password-generator-sometimes-not-including-character-selections
	function generatePassword(
		len: number,
		options: {
			numbers: boolean
			special: boolean
			lowerCase: boolean
			upperCase: boolean
		}
	) {
		const chars = {
			num: '1234567890',
			specialChar: '@#$',
			lowerCase: 'abcdefghijklmnopqrstuvwxyz',
			upperCase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
		}

		const shuffleStr = (str: string) =>
			str
				.split('')
				.sort(() => 0.5 - Math.random())
				.join('')

		const factor = Math.ceil(len / Object.values(options).reduce((a, b) => (b ? a + 1 : a), 0))

		let str = ''
		if (options.numbers) str += shuffleStr(chars.num.repeat(factor)).substring(0, factor)
		if (options.special) str += shuffleStr(chars.specialChar.repeat(factor)).substring(0, factor)
		if (options.lowerCase) str += shuffleStr(chars.lowerCase.repeat(factor)).substring(0, factor)
		if (options.upperCase) str += shuffleStr(chars.upperCase.repeat(factor)).substring(0, factor)

		return shuffleStr(str).substring(0, len)
	}

	async function register(e: MouseEvent) {
		e.stopPropagation()
		try {
			const password = generatePassword(32, {
				numbers: true,
				special: true,
				lowerCase: true,
				upperCase: true
			})
			await api.create('/auth/register', {
				id: row[getIdField(model)],
				username: row.email,
				email: row.email,
				roles: ['customer'],
				password1: password,
				password2: password
			})
		} catch (e) {
			console.error(e)
		}
	}

	return (
		!row.user && (
			<button class="v-btn v-btn--is-elevated v-btn--has-bg elevation-2 v-size--default" onclick={register}>
				{i18n.t('custom.register')}
			</button>
		)
	)
}

export default RegisterComponent
