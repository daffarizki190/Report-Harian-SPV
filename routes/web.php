<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;

Route::get('/', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login'])->name('login.post');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// Passwordless Magic Link Login
Route::post('/magic-link', [AuthController::class, 'sendMagicLink'])->name('magic.link.send');
Route::get('/magic-login/{user}', [AuthController::class, 'loginViaMagicLink'])
    ->name('magic.link.login')
    ->middleware('signed');

// TEMP DEBUG - remove after fixing env vars
Route::get('/debug-env', function () {
    $serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
    $anonKey    = env('SUPABASE_ANON_KEY');
    $url        = env('SUPABASE_URL');
    return response()->json([
        'SUPABASE_URL'              => $url ?: 'NOT SET',
        'SUPABASE_SERVICE_ROLE_KEY' => $serviceKey ? ('SET (' . strlen($serviceKey) . ' chars) starts: ' . substr($serviceKey, 0, 10) . '...') : 'NOT SET / EMPTY',
        'SUPABASE_ANON_KEY'         => $anonKey    ? ('SET (' . strlen($anonKey)    . ' chars) starts: ' . substr($anonKey,    0, 10) . '...') : 'NOT SET / EMPTY',
        'fallback_used'             => $serviceKey ? 'service_role' : ($anonKey ? 'anon' : 'NONE - upload will fail'),
    ]);
});

Route::middleware(['auth', 'prevent-back'])->group(function () {
    Route::get('/dashboard', [ReportController::class, 'dashboard'])->name('dashboard');

    Route::prefix('v1')->group(function () {
        Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('/reports/{id}', [ReportController::class, 'show'])->name('reports.show');
        Route::post('/reports', [ReportController::class, 'store'])->name('reports.store');
        Route::post('/reports/form', [ReportController::class, 'storeForm'])->name('reports.storeForm');
        Route::get('/reports/stats', [ReportController::class, 'stats'])->name('reports.stats');
        Route::get('/reports/logs', [ReportController::class, 'logs'])->name('reports.logs');
        Route::get('/system/info', [ReportController::class, 'systemInfo'])->name('system.info');
        Route::post('/reports/purge', [ReportController::class, 'purge'])->name('reports.purge');
        Route::get('/reports/purge', function () {
            return redirect()->route('dashboard');
        });
        Route::get('/reports/zip', [ReportController::class, 'downloadZIP'])->name('reports.zip');
        Route::delete('/reports/{id}', [ReportController::class, 'destroy'])->name('reports.destroy');

        // User Management (Admin Only)
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::post('/users', [UserController::class, 'store'])->name('users.store');
        Route::delete('/users/{id}', [UserController::class, 'destroy'])->name('users.destroy');
    });
});
