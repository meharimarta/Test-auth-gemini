<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import DangerButton from '@/Components/DangerButton.vue';
import InputError from '@/Components/InputError.vue';
import InputLabel from '@/Components/InputLabel.vue';
import Modal from '@/Components/Modal.vue';
import PrimaryButton from '@/Components/PrimaryButton.vue';
import TextInput from '@/Components/TextInput.vue';
import { Head, Link, useForm, usePage } from '@inertiajs/vue3';
import { ref } from 'vue';

defineProps({
    mustVerifyEmail: Boolean,
    status: String,
});

const user = usePage().props.auth.user;

const profileForm = useForm({
    name: user.name,
    email: user.email,
});

const passwordForm = useForm({
    current_password: '',
    password: '',
    password_confirmation: '',
});

const confirmingUserDeletion = ref(false);
const deleteForm = useForm({
    password: '',
});

const updatePassword = () => {
    passwordForm.put(route('password.update'), {
        preserveScroll: true,
        onSuccess: () => passwordForm.reset(),
    });
};

const deleteUser = () => {
    deleteForm.delete(route('profile.destroy'), {
        preserveScroll: true,
        onSuccess: () => (confirmingUserDeletion.value = false),
        onFinish: () => deleteForm.reset(),
    });
};
</script>

<template>
    <Head title="Profile & Security" />

    <AuthenticatedLayout>
        <template #header>
            <h1 class="font-display text-2xl font-semibold text-slate-900">Profile &amp; Security</h1>
            <p class="mt-1 text-sm text-slate-500">Manage your identity details, password credentials, and account lifecycle.</p>
        </template>

        <div class="space-y-8 max-w-3xl">
            <section class="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
                <h2 class="font-display text-base font-semibold text-slate-900">Profile Information</h2>
                <p class="mt-1 text-sm text-slate-500">Update your display name and primary email address.</p>

                <form @submit.prevent="profileForm.patch(route('profile.update'))" class="mt-6 space-y-5 max-w-lg">
                    <div>
                        <InputLabel for="name" value="Full Name" />
                        <TextInput id="name" type="text" v-model="profileForm.name" required />
                        <InputError :message="profileForm.errors.name" />
                    </div>

                    <div>
                        <InputLabel for="email" value="Email Address" />
                        <TextInput id="email" type="email" v-model="profileForm.email" required />
                        <InputError :message="profileForm.errors.email" />
                    </div>

                    <div v-if="mustVerifyEmail && user.email_verified_at === null" class="text-sm text-amber-700">
                        Your email address is unverified.
                        <Link :href="route('verification.send')" method="post" as="button" class="underline font-medium">
                            Resend verification email
                        </Link>
                    </div>

                    <div class="flex items-center gap-4">
                        <PrimaryButton :disabled="profileForm.processing">Save Changes</PrimaryButton>
                        <span v-if="profileForm.recentlySuccessful" class="text-sm text-emerald-700 font-medium">Saved.</span>
                    </div>
                </form>
            </section>

            <section class="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
                <h2 class="font-display text-base font-semibold text-slate-900">Update Password</h2>
                <p class="mt-1 text-sm text-slate-500">Use a long, unique password to protect your account.</p>

                <form @submit.prevent="updatePassword" class="mt-6 space-y-5 max-w-lg">
                    <div>
                        <InputLabel for="current_password" value="Current Password" />
                        <TextInput id="current_password" type="password" v-model="passwordForm.current_password" autocomplete="current-password" />
                        <InputError :message="passwordForm.errors.current_password" />
                    </div>

                    <div>
                        <InputLabel for="new_password" value="New Password" />
                        <TextInput id="new_password" type="password" v-model="passwordForm.password" autocomplete="new-password" />
                        <InputError :message="passwordForm.errors.password" />
                    </div>

                    <div>
                        <InputLabel for="confirm_new_password" value="Confirm Password" />
                        <TextInput id="confirm_new_password" type="password" v-model="passwordForm.password_confirmation" autocomplete="new-password" />
                        <InputError :message="passwordForm.errors.password_confirmation" />
                    </div>

                    <div class="flex items-center gap-4">
                        <PrimaryButton :disabled="passwordForm.processing">Update Password</PrimaryButton>
                        <span v-if="passwordForm.recentlySuccessful" class="text-sm text-emerald-700 font-medium">Updated.</span>
                    </div>
                </form>
            </section>

            <section class="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
                <h2 class="font-display text-base font-semibold text-slate-900">Delete Account</h2>
                <p class="mt-1 text-sm text-slate-500">Permanently delete your account and revoke all active sessions.</p>

                <div class="mt-5">
                    <DangerButton @click="confirmingUserDeletion = true">Delete Account</DangerButton>
                </div>

                <Modal :show="confirmingUserDeletion" @close="confirmingUserDeletion = false">
                    <h3 class="font-display text-lg font-semibold text-slate-900">Confirm Account Deletion</h3>
                    <p class="mt-2 text-sm text-slate-600">
                        Enter your current password to permanently delete your account. This action cannot be undone.
                    </p>

                    <div class="mt-5">
                        <InputLabel for="delete_password" value="Password" />
                        <TextInput id="delete_password" type="password" v-model="deleteForm.password" placeholder="Enter your password" />
                        <InputError :message="deleteForm.errors.password" />
                    </div>

                    <div class="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            @click="confirmingUserDeletion = false"
                            class="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <DangerButton :disabled="deleteForm.processing" @click="deleteUser">
                            Delete Account
                        </DangerButton>
                    </div>
                </Modal>
            </section>
        </div>
    </AuthenticatedLayout>
</template>
