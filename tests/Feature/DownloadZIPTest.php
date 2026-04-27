<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\User;
use App\Services\SupabaseStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DownloadZIPTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------
    // 1. Tidak ada laporan dengan file pada filter → 404
    // -------------------------------------------------------
    public function test_tidak_ada_file_menghasilkan_404(): void
    {
        $user = User::factory()->supervisor()->create();

        // Laporan tanpa file_path
        Report::factory()->count(3)->today()->create(['file_path' => null]);

        $this->actingAs($user)
             ->getJson(route('reports.zip'))
             ->assertStatus(404);
    }

    // -------------------------------------------------------
    // 2. Laporan dengan file_path mengembalikan daftar URL
    // -------------------------------------------------------
    public function test_laporan_dengan_file_mengembalikan_daftar_url(): void
    {
        $user = User::factory()->supervisor()->create();

        // Mock service agar publicUrl tidak butuh koneksi nyata
        $mockService = $this->mock(SupabaseStorageService::class);
        $mockService->shouldReceive('publicUrl')
                    ->andReturn('https://fake.supabase.co/storage/v1/object/public/daily-reports/path.pdf');

        Report::factory()->count(2)->withFile()->today()->create();
        // 1 laporan tanpa file — tidak boleh masuk respons
        Report::factory()->create(['file_path' => null]);

        $response = $this->actingAs($user)
                         ->getJson(route('reports.zip'));

        $response->assertStatus(200)
                 ->assertJsonCount(2)
                 ->assertJsonStructure([
                     '*' => ['name', 'url'],
                 ]);
    }

    // -------------------------------------------------------
    // 3. Filter tanggal mempersempit hasil ZIP
    // -------------------------------------------------------
    public function test_filter_tanggal_mempersempit_hasil_zip(): void
    {
        $user = User::factory()->supervisor()->create();

        $mockService = $this->mock(SupabaseStorageService::class);
        $mockService->shouldReceive('publicUrl')
                    ->andReturn('https://fake.supabase.co/storage/v1/object/public/daily-reports/path.pdf');

        Report::factory()->withFile()->create(['report_date' => '2026-02-01']);
        Report::factory()->withFile()->create(['report_date' => '2026-03-01']);
        Report::factory()->withFile()->create(['report_date' => '2026-05-01']);

        $response = $this->actingAs($user)
                         ->getJson(route('reports.zip', [
                             'start_date' => '2026-01-01',
                             'end_date'   => '2026-04-30',
                         ]));

        $response->assertStatus(200)
                 ->assertJsonCount(2);
    }
}
