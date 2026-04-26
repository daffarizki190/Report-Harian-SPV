<?php

$app = new Illuminate\Foundation\Application(
    $_ENV['APP_BASE_PATH'] ?? dirname(__DIR__)
);

/*
|--------------------------------------------------------------------------
| Vercel Read-Only Filesystem Fix
|--------------------------------------------------------------------------
*/
if (isset($_SERVER['VERCEL']) || isset($_ENV['VERCEL'])) {
    $app->useStoragePath('/tmp/storage');
    
    // Ensure storage and bootstrap/cache are mapped to /tmp
    $dirs = [
        '/tmp/storage/framework/views',
        '/tmp/storage/framework/cache',
        '/tmp/storage/framework/sessions',
        '/tmp/storage/bootstrap/cache',
        '/tmp/storage/logs'
    ];
    
    foreach ($dirs as $dir) {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }

    // Override the bootstrap cache path
    $app->instance('path.bootstrap', '/tmp/storage/bootstrap');

    // Also set specific cache paths
    $_ENV['APP_BOOTSTRAP_CACHE'] = '/tmp/storage/bootstrap/cache';
    $_ENV['APP_CONFIG_CACHE'] = '/tmp/storage/bootstrap/cache/config.php';
    $_ENV['APP_ROUTES_CACHE'] = '/tmp/storage/bootstrap/cache/routes.php';
    $_ENV['APP_SERVICES_CACHE'] = '/tmp/storage/bootstrap/cache/services.php';
    $_ENV['APP_PACKAGES_CACHE'] = '/tmp/storage/bootstrap/cache/packages.php';
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
