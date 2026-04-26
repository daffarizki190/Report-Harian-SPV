<?php

$app = new Illuminate\Foundation\Application(
    $_ENV['APP_BASE_PATH'] ?? dirname(__DIR__)
);

/*
|--------------------------------------------------------------------------
| Vercel Read-Only Filesystem Fix
|--------------------------------------------------------------------------
*/
if (isset($_SERVER['VERCEL'])) {
    $app->useStoragePath('/tmp/storage');
    
    // Ensure necessary directories exist in /tmp
    if (!is_dir('/tmp/storage/framework/views')) {
        mkdir('/tmp/storage/framework/views', 0755, true);
    }
    if (!is_dir('/tmp/storage/framework/cache')) {
        mkdir('/tmp/storage/framework/cache', 0755, true);
    }
    if (!is_dir('/tmp/storage/logs')) {
        mkdir('/tmp/storage/logs', 0755, true);
    }
}


$app->singleton(
    Illuminate\Contracts\Http\Kernel::class,
    App\Http\Kernel::class
);

$app->singleton(
    Illuminate\Contracts\Console\Kernel::class,
    App\Console\Kernel::class
);

$app->singleton(
    Illuminate\Contracts\Debug\ExceptionHandler::class,
    App\Exceptions\Handler::class
);

return $app;
