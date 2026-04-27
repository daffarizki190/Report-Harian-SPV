<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------
    // 1. Non-Admin mendapat 403
    // -------------------------------------------------------
    public function test_non_admin_mendapat_403_pada_logs(): void
    {
        $spv = User::factory()->supervisor()->create();

        $this->actingAs($spv)
             ->getJson(route('reports.logs'))
             ->assertStatus(403);
    }

    // -------------------------------------------------------
    // 2. Admin mendapat daftar log
    // -------------------------------------------------------
    public function test_admin_dapat_melihat_log_aktivitas(): void
    {
        $admin = User::factory()->admin()->create();

        // Buat 5 entri log secara langsung
        for ($i = 1; $i <= 5; $i++) {
            DB::table('activity_logs')->insert([
                'user_name'  => 'Sistem',
                'action'     => 'Test',
                'details'    => "Log ke-{$i}",
                'ip_address' => '127.0.0.1',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $response = $this->actingAs($admin)
                         ->getJson(route('reports.logs'));

        $response->assertStatus(200)
                 ->assertJsonCount(5);
    }

    // -------------------------------------------------------
    // 3. Hanya menampilkan maks 50 entri terbaru
    // -------------------------------------------------------
    public function test_log_dibatasi_50_entri_terbaru(): void
    {
        $admin = User::factory()->admin()->create();

        // Buat 60 entri log
        $rows = array_map(fn ($i) => [
            'user_name'  => 'Sistem',
            'action'     => 'Test',
            'details'    => "Log ke-{$i}",
            'ip_address' => '127.0.0.1',
            'created_at' => now(),
            'updated_at' => now(),
        ], range(1, 60));

        DB::table('activity_logs')->insert($rows);

        $response = $this->actingAs($admin)
                         ->getJson(route('reports.logs'));

        $response->assertStatus(200)
                 ->assertJsonCount(50);
    }
}
