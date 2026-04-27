<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------
    // 1. Tamu melihat halaman login
    // -------------------------------------------------------
    public function test_tamu_dapat_melihat_halaman_login(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
        $response->assertViewIs('login');
    }

    // -------------------------------------------------------
    // 2. Pengguna terautentikasi diarahkan ke dashboard
    // -------------------------------------------------------
    public function test_pengguna_terautentikasi_diarahkan_ke_dashboard(): void
    {
        $user = User::factory()->supervisor()->create();

        $response = $this->actingAs($user)->get('/');

        $response->assertRedirect(route('dashboard'));
    }

    // -------------------------------------------------------
    // 3. Login sukses dengan kredensial benar
    // -------------------------------------------------------
    public function test_login_sukses_dengan_kredensial_benar(): void
    {
        $user = User::factory()->create([
            'username' => 'spv01',
            'password' => bcrypt('rahasia123'),
        ]);

        $response = $this->post('/login', [
            'username' => 'spv01',
            'password' => 'rahasia123',
        ]);

        $response->assertRedirect('dashboard');
        $this->assertAuthenticatedAs($user);
    }

    // -------------------------------------------------------
    // 4. Login gagal dengan password salah
    // -------------------------------------------------------
    public function test_login_gagal_dengan_password_salah(): void
    {
        User::factory()->create([
            'username' => 'spv01',
            'password' => bcrypt('rahasia123'),
        ]);

        $response = $this->post('/login', [
            'username' => 'spv01',
            'password' => 'salah',
        ]);

        $response->assertSessionHasErrors('username');
        $this->assertGuest();
    }

    // -------------------------------------------------------
    // 5. Logout membersihkan sesi
    // -------------------------------------------------------
    public function test_logout_membersihkan_sesi(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $response->assertRedirect('/');
        $this->assertGuest();
    }
}
