<script setup>
import GuestLayout from '@/Layouts/GuestLayout.vue';
import InputError from '@/Components/InputError.vue';
import InputLabel from '@/Components/InputLabel.vue';
import PrimaryButton from '@/Components/PrimaryButton.vue';
import TextInput from '@/Components/TextInput.vue';
import { Head, Link, useForm } from '@inertiajs/vue3';

defineProps({
    status: {
        type: String,
    },
});

const form = useForm({
    email: '',
});

const submit = () => {
    form.post(route('password.email'));
};
</script>

<template>
    <GuestLayout>
        <Head title="Forgot Password" />

        <div class="mb-6">
            <h1 class="font-display text-xl font-semibold text-slate-900">Reset your password</h1>
            <p class="mt-1 text-sm text-slate-600">
                Enter your email address and we will send a password reset link.
            </p>
        </div>

        <div v-if="status" class="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800">
            {{ status }}
        </div>

        <form @submit.prevent="submit" class="space-y-5">
            <div>
                <InputLabel for="email" value="Email Address" />
                <TextInput
                    id="email"
                    type="email"
                    v-model="form.email"
                    required
                    autofocus
                    autocomplete="username"
                />
                <InputError :message="form.errors.email" />
            </div>

            <PrimaryButton class="w-full" :disabled="form.processing">
                Send Reset Link
            </PrimaryButton>
        </form>

        <p class="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
            Remembered it?
            <Link :href="route('login')" class="font-medium text-slate-900 hover:underline underline-offset-4">
                Back to sign in
            </Link>
        </p>
    </GuestLayout>
</template>
