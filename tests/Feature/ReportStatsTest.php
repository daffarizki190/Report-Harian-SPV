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
    // 1. Supervisor mendapat stats yang di-scope untuk dirinya sendiri
    // -------------------------------------------------------
    public function test_supervisor_mendapat_stats_sendiri_saja(): void
    {
        $spv1 = User::factory()->supervisor()->create(['name' => 'SPV 1']);
        $spv2 = User::factory()->supervisor()->create(['name' => 'SPV 2']);

        // 3 laporan SPV 1 (1 hari ini, 2 kemarin)
        Report::factory()->create(['user_id' => $spv1->id, 'spv_name' => $spv1->name, 'report_date' => now()->toDateString()]);
        Report::factory()->count(2)->create(['user_id' => $spv1->id, 'spv_name' => $spv1->name, 'report_date' => now()->subDay()->toDateString()]);

        // 2 laporan SPV 2
        Report::factory()->count(2)->create(['user_id' => $spv2->id, 'spv_name' => $spv2->name]);

        $response = $this->actingAs($spv1)
                         ->getJson(route('reports.stats'));

        $response->assertStatus(200)
                 ->assertJsonFragment(['total' => 3])
                 ->assertJsonFragment(['today' => 1]);
    }

    // -------------------------------------------------------
    // 2. Management mendapat stats global
    // -------------------------------------------------------
    public function test_management_mendapat_stats_global(): void
    {
        $mgmt = User::factory()->management()->create();
        $spv = User::factory()->supervisor()->create();

        // 5 laporan total dari supervisor lain
        Report::factory()->count(2)->create(['user_id' => $spv->id, 'spv_name' => $spv->name, 'report_date' => now()->toDateString()]);
        Report::factory()->count(3)->create(['user_id' => $spv->id, 'spv_name' => $spv->name, 'report_date' => now()->subDay()->toDateString()]);

        $response = $this->actingAs($mgmt)
                         ->getJson(route('reports.stats'));

        $response->assertStatus(200)
                 ->assertJsonFragment(['total' => 5])
                 ->assertJsonFragment(['today' => 2]);
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
