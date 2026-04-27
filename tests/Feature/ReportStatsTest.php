<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportStatsTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------
    // 1. Non-Admin mendapat 403
    // -------------------------------------------------------
    public function test_non_admin_mendapat_403_pada_stats(): void
    {
        $spv = User::factory()->supervisor()->create();

        $this->actingAs($spv)
             ->getJson(route('reports.stats'))
             ->assertStatus(403);
    }

    public function test_management_mendapat_403_pada_stats(): void
    {
        $mgmt = User::factory()->management()->create();

        $this->actingAs($mgmt)
             ->getJson(route('reports.stats'))
             ->assertStatus(403);
    }

    // -------------------------------------------------------
    // 2. Admin mendapat jumlah total & hari ini yang benar
    // -------------------------------------------------------
    public function test_admin_mendapat_stats_yang_benar(): void
    {
        $admin = User::factory()->admin()->create();

        // 2 laporan kemarin
        Report::factory()->count(2)->create([
            'report_date' => now()->subDay()->toDateString(),
        ]);

        // 3 laporan hari ini
        Report::factory()->count(3)->today()->create();

        $response = $this->actingAs($admin)
                         ->getJson(route('reports.stats'));

        $response->assertStatus(200)
                 ->assertJsonFragment(['total' => 5])
                 ->assertJsonFragment(['today' => 3]);
    }
}
