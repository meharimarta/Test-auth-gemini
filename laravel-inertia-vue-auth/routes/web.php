<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route(auth()->check() ? 'dashboard' : 'login');
});

Route::get('/dashboard', function () {
    $sessions = DB::table('sessions')
        ->where('user_id', auth()->id())
        ->orderByDesc('last_activity')
        ->get()
        ->map(fn ($session) => [
            'id' => $session->id,
            'ip_address' => $session->ip_address,
            'user_agent' => $session->user_agent,
            'is_current_device' => $session->id === session()->getId(),
            'last_active' => \Carbon\Carbon::createFromTimestamp($session->last_activity)->diffForHumans(),
        ]);

    return Inertia::render('Dashboard', [
        'sessions' => $sessions,
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::delete('/sessions/{sessionId}', [ProfileController::class, 'destroySession'])->name('sessions.destroy');
});

require __DIR__.'/auth.php';
