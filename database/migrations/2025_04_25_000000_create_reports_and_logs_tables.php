<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $column) {
            $column->id();
            $column->string('spv_name');
            $column->date('report_date');
            $column->string('shift');
            $column->text('description')->nullable();
            $column->text('manual_content')->nullable();
            $column->string('file_path')->nullable();
            $column->timestamps();

            // Professional Constraint: 1 report per SPV per day
            $column->unique(['spv_name', 'report_date']);
        });

        Schema::create('activity_logs', function (Blueprint $column) {
            $column->id();
            $column->string('user_name');
            $column->string('action');
            $column->string('details');
            $column->string('ip_address')->nullable();
            $column->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
        Schema::dropIfExists('activity_logs');
    }
};
