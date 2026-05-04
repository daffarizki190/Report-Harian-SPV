<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'spv_name',
        'report_date',
        'shift',
        'description',
        'manual_content',
        'file_path',
        'form_data',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    protected $casts = [
        'form_data' => 'array',
    ];

    /**
     * Get public URL from Supabase Storage.
     */
    public function getFileUrlAttribute()
    {
        if (!$this->file_path) return null;
        
        // Use app() to get the service from container
        return app(\App\Services\SupabaseStorageService::class)->publicUrl($this->file_path);
    }
}
