<script setup>
import { Link } from '@inertiajs/vue3';
</script>

<template>
    <div class="min-h-screen bg-slate-50 flex flex-col justify-between px-6 py-8">
        <header class="max-w-5xl w-full mx-auto flex items-center justify-between gap-8">
            <Link :href="route('login')" class="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
                ForgeAuth
            </Link>
            <nav class="flex items-center gap-6 text-sm font-medium text-slate-600">
                <Link :href="route('login')" class="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
                    Sign In
                </Link>
                <Link :href="route('register')" class="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
                    Create Account
                </Link>
            </nav>
        </header>

        <main class="w-full max-w-md mx-auto my-12">
            <div class="bg-white border border-slate-200 rounded-xl p-8">
                <slot />
            </div>
        </main>

        <footer class="max-w-5xl w-full mx-auto text-xs text-slate-500 flex items-center justify-between">
            <span>ForgeAuth Identity System</span>
            <span>Laravel · Inertia.js · Vue 3</span>
        </footer>
    </div>
</template>
