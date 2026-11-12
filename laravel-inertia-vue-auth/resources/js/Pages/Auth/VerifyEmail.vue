<script setup>
import { computed } from 'vue';
import GuestLayout from '@/Layouts/GuestLayout.vue';
import PrimaryButton from '@/Components/PrimaryButton.vue';
import { Head, Link, useForm } from '@inertiajs/vue3';

const props = defineProps({
    status: {
        type: String,
    },
});

const form = useForm({});

const submit = () => {
    form.post(route('verification.send'));
};

const verificationLinkSent = computed(
    () => props.status === 'verification-link-sent',
);
</script>

<template>
    <GuestLayout>
        <Head title="Verify Email" />

        <div class="mb-5">
            <h1 class="font-display text-xl font-semibold text-slate-900">Verify your email address</h1>
            <p class="mt-1.5 text-sm text-slate-600 leading-relaxed">
                Before accessing your dashboard, please verify your email address by clicking the link we sent you.
            </p>
        </div>

        <div
            v-if="verificationLinkSent"
            class="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800"
        >
            A fresh verification link has been sent to your email address.
        </div>

        <form @submit.prevent="submit" class="flex items-center justify-between gap-4">
            <PrimaryButton :disabled="form.processing">
                Resend Verification Email
            </PrimaryButton>

            <Link
                :href="route('logout')"
                method="post"
                as="button"
                class="text-sm font-medium text-slate-600 hover:text-slate-900 underline underline-offset-4"
            >
                Sign Out
            </Link>
        </form>
    </GuestLayout>
</template>
