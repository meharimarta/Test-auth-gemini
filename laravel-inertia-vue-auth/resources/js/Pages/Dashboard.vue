<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head, router, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

defineProps({
    sessions: {
        type: Array,
        default: () => [],
    },
    laravelVersion: String,
    phpVersion: String,
});

const user = computed(() => usePage().props.auth.user);

const revokeSession = (sessionId) => {
    router.delete(route('sessions.destroy', sessionId), {
        preserveScroll: true,
    });
};
</script>

<template>
    <Head title="Overview" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 class="font-display text-2xl font-semibold text-slate-900">
                        Welcome back, {{ user.name }}
                    </h1>
                    <p class="mt-1 text-sm text-slate-500">
                        {{ user.email }} · {{ user.email_verified_at ? 'Email Verified' : 'Pending Verification' }}
                    </p>
                </div>
            </div>
        </template>

        <section class="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                    <h2 class="font-display text-base font-semibold text-slate-900">Active Sessions</h2>
                    <p class="text-sm text-slate-500 mt-0.5">Devices currently signed in to your account.</p>
                </div>
                <span class="font-mono text-xs tabular-nums text-slate-500">
                    {{ sessions.length }} active
                </span>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                        <tr>
                            <th class="px-6 py-3 font-medium">IP Address</th>
                            <th class="px-6 py-3 font-medium">Device / User Agent</th>
                            <th class="px-6 py-3 font-medium text-right">Last Active</th>
                            <th class="px-6 py-3 font-medium text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-for="session in sessions" :key="session.id" class="hover:bg-slate-50/60">
                            <td class="px-6 py-3.5 font-mono text-xs tabular-nums text-slate-900 whitespace-nowrap">
                                {{ session.ip_address || '127.0.0.1' }}
                            </td>
                            <td class="px-6 py-3.5 text-slate-600 max-w-md truncate">
                                {{ session.user_agent || 'Unknown Browser' }}
                            </td>
                            <td class="px-6 py-3.5 font-mono text-xs tabular-nums text-slate-500 text-right whitespace-nowrap">
                                {{ session.last_active }}
                            </td>
                            <td class="px-6 py-3.5 text-right whitespace-nowrap">
                                <span v-if="session.is_current_device" class="text-xs font-medium text-emerald-700">
                                    Current device
                                </span>
                                <button
                                    v-else
                                    @click="revokeSession(session.id)"
                                    class="text-xs font-medium text-red-600 hover:text-red-700"
                                >
                                    Revoke
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    </AuthenticatedLayout>
</template>
