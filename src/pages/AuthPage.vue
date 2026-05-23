<template>
	<q-page class="flex flex-center bg-grey-1">
		<q-card style="width: 380px" class="q-pa-lg shadow-4">
			
			<q-card-section class="text-center q-pb-none">
				<q-icon name="event_note" size="48px" color="primary" />
				<div class="text-h5 text-weight-bold q-mt-sm">{{ t('auth.title') }}</div>
				<div class="text-grey-6 q-mt-xs">
					{{ isLogin ? t('auth.subtitle_login') : t('auth.subtitle_register') }}
				</div>
			</q-card-section>
			
			<q-card-section class="q-gutter-md q-mt-sm">
				<q-input
				v-model="email"
				:label="t('auth.email')"
				type="email"
				outlined
				dense
				@keyup.enter="handleSubmit"
				>
				<template #prepend>
					<q-icon name="mail" />
				</template>
			</q-input>
			
			<q-input
			v-model="password"
			:label="t('auth.password')"
			type="password"
			outlined
			dense
			@keyup.enter="handleSubmit"
			>
			<template #prepend>
				<q-icon name="lock" />
			</template>
		</q-input>
		
		<q-banner
		v-if="error"
		class="bg-red-1 text-red-8 rounded-borders"
		dense
		>
		<template #avatar>
			<q-icon name="error" />
		</template>
		{{ error }}
	</q-banner>
	
	<q-banner
	v-if="success"
	class="bg-green-1 text-green-8 rounded-borders"
	dense
	>
	<template #avatar>
		<q-icon name="check_circle" />
	</template>
	{{ success }}
</q-banner>

<q-btn
:label="isLogin ? t('auth.login') : t('auth.register')"
color="primary"
class="full-width"
:loading="authStore.loading"
@click="handleSubmit"
/>

<div class="text-center text-grey-6 text-caption">
	{{ isLogin ? t('auth.no_account') : t('auth.has_account') }}
	<span
	class="text-primary cursor-pointer text-weight-medium"
	@click="isLogin = !isLogin"
	>
	{{ isLogin ? t('auth.register') : t('auth.login') }}
</span>
</div>
</q-card-section>

</q-card>
</q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from 'src/stores/auth.store'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const authStore = useAuthStore()
const router = useRouter()

const isLogin = ref(true)
const email = ref('')
const password = ref('')
const error = ref('')
const success = ref('')

async function handleSubmit() {
	error.value = ''
	success.value = ''
	try {
		if (isLogin.value) {
			await authStore.signInWithEmail(email.value, password.value)
			await router.push('/')
		} else {
			await authStore.signUp(email.value, password.value)
			success.value = t('auth.confirm_email')
		}
	} catch (e) {
		error.value = e instanceof Error ? e.message : 'Unknown error'
	}
}
</script>