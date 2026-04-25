<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    use HasFactory;

    protected $fillable = [
        'spv_name',
        'report_date',
        'shift',
        'description',
        'manual_content',
        'file_path'
    ];
}
