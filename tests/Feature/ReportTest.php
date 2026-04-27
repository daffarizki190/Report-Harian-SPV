<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\User;
use App\Services\SupabaseStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------
    // 1. Tamu tidak bisa akses daftar laporan
    // -------------------------------------------------------
    public function test_tamu_tidak_dapat_mengakses_daftar_laporan(): void
    {
        $this->get(route('reports.index'))
             ->assertRedirect(route('login'));
    }

    // -------------------------------------------------------
    // 2. Pengguna terautentikasi bisa melihat laporan
    // -------------------------------------------------------
    public function test_pengguna_terautentikasi_dapat_melihat_daftar_laporan(): void
    {
        $user = User::factory()->supervisor()->create();
        Report::factory()->count(3)->create();

        $this->actingAs($user)
             ->get(route('reports.index'))
             ->assertStatus(200)
             ->assertJsonCount(3);
    }

    // -------------------------------------------------------
    // 3. Filter start_date & end_date mempersempit hasil
    // -------------------------------------------------------
    public function test_filter_tanggal_mempersempit_hasil(): void
    {
        $user = User::factory()->supervisor()->create();

        Report::factory()->create(['report_date' => '2026-01-10']);
        Report::factory()->create(['report_date' => '2026-03-15']);
        Report::factory()->create(['report_date' => '2026-05-20']);

        $response = $this->actingAs($user)
                         ->get(route('reports.index', [
                             'start_date' => '2026-01-01',
                             'end_date'   => '2026-04-30',
                         ]));

        $response->assertStatus(200)
                 ->assertJsonCount(2);
    }

    // -------------------------------------------------------
    // 4. Filter shift mempersempit hasil
    // -------------------------------------------------------
    public function test_filter_shift_mempersempit_hasil(): void
    {
        $user = User::factory()->supervisor()->create();

        Report::factory()->create(['shift' => 'Pagi']);
        Report::factory()->create(['shift' => 'Siang']);
        Report::factory()->create(['shift' => 'Malam']);

        $response = $this->actingAs($user)
                         ->get(route('reports.index', ['shift' => 'Pagi']));

        $response->assertStatus(200)
                 ->assertJsonCount(1);
    }

    // -------------------------------------------------------
    // 5. Non-Supervisor tidak bisa kirim laporan
    // -------------------------------------------------------
    public function test_non_supervisor_mendapat_403_saat_kirim_laporan(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
             ->postJson(route('reports.store'), [
                 'report_date'    => '2026-04-28',
                 'shift'          => 'Pagi',
                 'manual_content' => 'Isi laporan manual.',
             ])
             ->assertStatus(403);
    }

    // -------------------------------------------------------
    // 6. Supervisor dapat kirim laporan manual
    // -------------------------------------------------------
    public function test_supervisor_dapat_kirim_laporan_manual(): void
    {
        $spv = User::factory()->supervisor()->create(['name' => 'Budi Santoso']);

        $response = $this->actingAs($spv)
                         ->postJson(route('reports.store'), [
                             'report_date'    => '2026-04-28',
                             'shift'          => 'Pagi',
                             'manual_content' => 'Semua kondisi aman, tidak ada insiden.',
                         ]);

        $response->assertStatus(200)
                 ->assertJsonFragment(['message' => 'Laporan berhasil disimpan.']);

        $this->assertDatabaseHas('reports', [
            'spv_name'    => 'Budi Santoso',
            'report_date' => '2026-04-28',
            'shift'       => 'Pagi',
        ]);
    }

    // -------------------------------------------------------
    // 7. Supervisor dapat kirim laporan dengan PDF (upload di-mock)
    // -------------------------------------------------------
    public function test_supervisor_dapat_kirim_laporan_dengan_pdf(): void
    {
        $spv = User::factory()->supervisor()->create(['name' => 'Citra Dewi']);

        // Mock SupabaseStorageService agar tidak melakukan cURL sungguhan
        $mockService = $this->mock(SupabaseStorageService::class);
        $mockService->shouldReceive('upload')
                    ->once()
                    ->andReturn('REPORTS/2026-04-28/Citra_Dewi_2026-04-28_Siang.pdf');
        $mockService->shouldReceive('publicUrl')
                    ->andReturn('https://fake.supabase.co/storage/v1/object/public/daily-reports/REPORTS/2026-04-28/Citra_Dewi_2026-04-28_Siang.pdf');

        $file = UploadedFile::fake()->create('laporan.pdf', 512, 'application/pdf');

        $response = $this->actingAs($spv)
                         ->postJson(route('reports.store'), [
                             'report_date' => '2026-04-28',
                             'shift'       => 'Siang',
                             'report_file' => $file,
                         ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('reports', [
            'spv_name' => 'Citra Dewi',
            'shift'    => 'Siang',
        ]);
    }

    // -------------------------------------------------------
    // 8. Pengiriman ke-2 pada tanggal yang sama memperbarui laporan
    // -------------------------------------------------------
    public function test_pengiriman_kedua_memperbarui_laporan_yang_ada(): void
    {
        $spv = User::factory()->supervisor()->create(['name' => 'Doni Pratama']);

        // Kiriman pertama
        $this->actingAs($spv)->postJson(route('reports.store'), [
            'report_date'    => '2026-04-28',
            'shift'          => 'Pagi',
            'manual_content' => 'Isi pertama.',
        ]);

        // Kiriman kedua — shift berubah
        $this->actingAs($spv)->postJson(route('reports.store'), [
            'report_date'    => '2026-04-28',
            'shift'          => 'Malam',
            'manual_content' => 'Isi diperbarui.',
        ]);

        // Tetap hanya 1 baris di database
        $this->assertDatabaseCount('reports', 1);
        $this->assertDatabaseHas('reports', [
            'spv_name' => 'Doni Pratama',
            'shift'    => 'Malam',
        ]);
    }

    // -------------------------------------------------------
    // 9. report_date kosong → error validasi 422
    // -------------------------------------------------------
    public function test_report_date_kosong_menghasilkan_error_validasi(): void
    {
        $spv = User::factory()->supervisor()->create();

        $this->actingAs($spv)
             ->postJson(route('reports.store'), [
                 'shift'          => 'Pagi',
                 'manual_content' => 'Tanpa tanggal.',
             ])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['report_date']);
    }

    // -------------------------------------------------------
    // 10. shift tidak valid → error validasi 422
    // -------------------------------------------------------
    public function test_shift_tidak_valid_menghasilkan_error_validasi(): void
    {
        $spv = User::factory()->supervisor()->create();

        $this->actingAs($spv)
             ->postJson(route('reports.store'), [
                 'report_date'    => '2026-04-28',
                 'shift'          => 'Tengah Malam', // bukan Pagi/Siang/Malam
                 'manual_content' => 'Shift salah.',
             ])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['shift']);
    }
}
