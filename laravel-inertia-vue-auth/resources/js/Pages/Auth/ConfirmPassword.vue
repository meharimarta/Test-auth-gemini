<script setup>
import GuestLayout from '@/Layouts/GuestLayout.vue';
import InputError from '@/Components/InputError.vue';
import InputLabel from '@/Components/InputLabel.vue';
import PrimaryButton from '@/Components/PrimaryButton.vue';
import TextInput from '@/Components/TextInput.vue';
import { Head, useForm } from '@inertiajs/vue3';

const form = useForm({
    password: '',
});

const submit = () => {
    form.post(route('password.confirm'), {
        onFinish: () => form.reset(),
    });
};
</script>

<template>
    <GuestLayout>
        <Head title="Confirm Password" />

        <div class="mb-6">
            <h1 class="font-display text-xl font-semibold text-slate-900">Confirm your password</h1>
            <p class="mt-1 text-sm text-slate-600">
                This is a protected area. Please confirm your password before continuing.
            </p>
        </div>

        <form @submit.prevent="submit" class="space-y-5">
            <div>
                <InputLabel for="password" value="Password" />
                <TextInput
                    id="password"
                    type="password"
                    v-model="form.password"
                    required
                    autofocus
                    autocomplete="current-password"
                />
                <InputError :message="form.errors.password" />
            </div>

            <PrimaryButton class="w-full" :disabled="form.processing">
                Confirm Password
            </PrimaryButton>
        </form>
    </GuestLayout>
</template>
