<?php

namespace App\Services;

use Exception;

class SupabaseStorageService
{
    private string $supabaseUrl;
    private string $bucket;
    private string $serviceKey;

    public function __construct()
    {
        $this->supabaseUrl = rtrim(env('SUPABASE_URL', ''), '/');
        $this->bucket      = env('SUPABASE_BUCKET', 'daily-reports');
        $this->serviceKey  = env('SUPABASE_SERVICE_ROLE_KEY', env('SUPABASE_ANON_KEY', ''));
    }

    /**
     * Upload file ke Supabase Storage menggunakan REST API.
     * Mengembalikan storage path yang berhasil diupload.
     *
     * @throws Exception jika upload gagal.
     */
    public function upload(string $localFilePath, string $storagePath): string
    {
        $uploadUrl    = "{$this->supabaseUrl}/storage/v1/object/{$this->bucket}/{$storagePath}";
        $fileContents = file_get_contents($localFilePath);

        $ch = curl_init($uploadUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'POST',
            CURLOPT_POSTFIELDS     => $fileContents,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $this->serviceKey,
                'Content-Type: application/pdf',
                'x-upsert: true',
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode < 200 || $httpCode >= 300) {
            throw new Exception("Supabase upload gagal (HTTP {$httpCode}): {$response}");
        }

        return $storagePath;
    }

    /**
     * Mengembalikan public URL untuk file di Supabase Storage.
     */
    public function publicUrl(string $storagePath): string
    {
        return "{$this->supabaseUrl}/storage/v1/object/public/{$this->bucket}/{$storagePath}";
    }
}
