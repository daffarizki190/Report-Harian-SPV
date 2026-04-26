<?php

return [

    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app'),
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        // Professional Disk: Supabase (S3 Compatible)
        'supabase' => [
            'driver' => 's3',
            'key' => trim(env('SUPABASE_ACCESS_KEY_ID')),
            'secret' => trim(env('SUPABASE_SECRET_ACCESS_KEY')),
            'region' => 'us-east-1',
            'bucket' => trim(env('SUPABASE_BUCKET', 'daily-reports')),
            'endpoint' => 'https://' . trim(parse_url(env('SUPABASE_URL'), PHP_URL_HOST)) . '/storage/v1/s3',
            'use_path_style_endpoint' => true,
            'version' => 'latest',
            'throw' => true,
        ],

    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
