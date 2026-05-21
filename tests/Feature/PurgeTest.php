<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurgeTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------
    // 1. Non-Management mendapat 403
    // -------------------------------------------------------
    public function test_non_management_mendapat_403_pada_purge(): void
    {
        $leader = User::factory()->create(['role' => 'Leader']);

        $this->actingAs($leader)
             ->postJson(route('reports.purge'), [
                 'start_date' => '2026-01-01',
                 'end_date'   => '2026-12-31',
             ])
             ->assertStatus(403);
    }

    public function test_supervisor_mendapat_403_pada_purge(): void
    {
        $spv = User::factory()->supervisor()->create();

        $this->actingAs($spv)
             ->postJson(route('reports.purge'), ['all' => true])
             ->assertStatus(403);
    }

    // -------------------------------------------------------
    // 2. Management purge berdasarkan rentang tanggal
    // -------------------------------------------------------
    public function test_management_dapat_purge_berdasarkan_rentang_tanggal(): void
    {
        $mgmt = User::factory()->management()->create();

        // Laporan dalam rentang → harus terhapus
        Report::factory()->count(3)->create(['report_date' => '2026-03-15']);

        // Laporan di luar rentang → harus tetap ada
        Report::factory()->count(2)->create(['report_date' => '2026-05-20']);

        $response = $this->actingAs($mgmt)
                         ->postJson(route('reports.purge'), [
                             'start_date' => '2026-01-01',
                             'end_date'   => '2026-04-30',
                         ]);

        $response->assertStatus(200)
                 ->assertJsonFragment(['count' => 3]);

        $this->assertDatabaseCount('reports', 2);
    }

    // -------------------------------------------------------
    // 3. Management purge semua data (all=true)
    // -------------------------------------------------------
    public function test_management_dapat_purge_semua_data(): void
    {
        $mgmt = User::factory()->management()->create();

        Report::factory()->count(5)->create();

        $response = $this->actingAs($mgmt)
                         ->postJson(route('reports.purge'), ['all' => true]);

        $response->assertStatus(200)
                 ->assertJsonFragment(['count' => 5]);

        $this->assertDatabaseCount('reports', 0);
    }
}
