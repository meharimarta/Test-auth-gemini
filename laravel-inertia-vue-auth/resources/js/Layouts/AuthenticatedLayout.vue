<script setup>
import { Link, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

const page = usePage();
const user = computed(() => page.props.auth.user);
</script>

<template>
    <div class="min-h-screen bg-slate-50 text-slate-900">
        <header class="bg-white border-b border-slate-200">
            <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
                <Link :href="route('dashboard')" class="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
                    ForgeAuth
                </Link>

                <nav class="flex items-center gap-6 text-sm font-medium text-slate-600">
                    <Link
                        :href="route('dashboard')"
                        :class="[
                            'whitespace-nowrap shrink-0 transition-colors',
                            route().current('dashboard') ? 'text-slate-900 font-semibold' : 'hover:text-slate-900'
                        ]"
                    >
                        Overview
                    </Link>
                    <Link
                        :href="route('profile.edit')"
                        :class="[
                            'whitespace-nowrap shrink-0 transition-colors',
                            route().current('profile.edit') ? 'text-slate-900 font-semibold' : 'hover:text-slate-900'
                        ]"
                    >
                        Profile &amp; Security
                    </Link>
                </nav>

                <div class="flex items-center gap-4 shrink-0">
                    <span class="hidden sm:inline text-xs text-slate-500 truncate max-w-[180px]">
                        {{ user?.email }}
                    </span>
                    <Link
                        :href="route('logout')"
                        method="post"
                        as="button"
                        class="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                    >
                        Sign Out
                    </Link>
                </div>
            </div>
        </header>

        <main class="max-w-6xl mx-auto px-6 py-10">
            <div v-if="$slots.header" class="mb-8 pb-6 border-b border-slate-200">
                <slot name="header" />
            </div>
            <slot />
        </main>
    </div>
</template>
