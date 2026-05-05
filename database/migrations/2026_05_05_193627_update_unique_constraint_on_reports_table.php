<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            // Drop old unique constraint
            $table->dropUnique(['spv_name', 'report_date']);
            
            // Add new unique constraint including shift
            $table->unique(['spv_name', 'report_date', 'shift']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            $table->dropUnique(['spv_name', 'report_date', 'shift']);
            $table->unique(['spv_name', 'report_date']);
        });
    }
};
