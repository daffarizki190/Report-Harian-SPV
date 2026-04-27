<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------
    // 1. Non-Admin tidak dapat melihat daftar user
    // -------------------------------------------------------
    public function test_non_admin_tidak_dapat_melihat_daftar_user(): void
    {
        $spv = User::factory()->supervisor()->create();

        $this->actingAs($spv)
             ->getJson(route('users.index'))
             ->assertStatus(403);
    }

    // -------------------------------------------------------
    // 2. Admin dapat melihat semua user
    // -------------------------------------------------------
    public function test_admin_dapat_melihat_semua_user(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->supervisor()->count(3)->create();

        $response = $this->actingAs($admin)
                         ->getJson(route('users.index'));

        // 1 admin + 3 supervisor = 4
        $response->assertStatus(200)
                 ->assertJsonCount(4);
    }

    // -------------------------------------------------------
    // 3. Admin dapat membuat user baru
    // -------------------------------------------------------
    public function test_admin_dapat_membuat_user_baru(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)
                         ->postJson(route('users.store'), [
                             'name'     => 'Eko Prasetyo',
                             'username' => 'eko.prasetyo',
                             'role'     => 'Supervisor',
                             'password' => 'rahasia123',
                         ]);

        $response->assertStatus(200)
                 ->assertJsonFragment(['message' => 'User berhasil disimpan.']);

        $this->assertDatabaseHas('users', [
            'username' => 'eko.prasetyo',
            'role'     => 'Supervisor',
        ]);
    }

    // -------------------------------------------------------
    // 4. Username duplikat menghasilkan error validasi 422
    // -------------------------------------------------------
    public function test_username_duplikat_menghasilkan_error_validasi(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->create(['username' => 'duplikat.user']);

        $this->actingAs($admin)
             ->postJson(route('users.store'), [
                 'name'     => 'User Lain',
                 'username' => 'duplikat.user',
                 'role'     => 'Supervisor',
                 'password' => 'rahasia123',
             ])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['username']);
    }

    // -------------------------------------------------------
    // 5. Admin dapat menghapus user lain
    // -------------------------------------------------------
    public function test_admin_dapat_menghapus_user_lain(): void
    {
        $admin  = User::factory()->admin()->create();
        $target = User::factory()->supervisor()->create();

        $response = $this->actingAs($admin)
                         ->deleteJson(route('users.destroy', $target->id));

        $response->assertStatus(200)
                 ->assertJsonFragment(['message' => 'User berhasil dihapus.']);

        $this->assertDatabaseMissing('users', ['id' => $target->id]);
    }

    // -------------------------------------------------------
    // 6. Admin tidak dapat menghapus akun sendiri
    // -------------------------------------------------------
    public function test_admin_tidak_dapat_menghapus_akun_sendiri(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
             ->deleteJson(route('users.destroy', $admin->id))
             ->assertStatus(422)
             ->assertJsonFragment(['message' => 'Anda tidak bisa menghapus akun sendiri.']);

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    // -------------------------------------------------------
    // 7. Role tidak valid menghasilkan error validasi
    // -------------------------------------------------------
    public function test_role_tidak_valid_menghasilkan_error_validasi(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
             ->postJson(route('users.store'), [
                 'name'     => 'User Baru',
                 'username' => 'user.baru',
                 'role'     => 'SuperAdmin', // tidak ada di sistem
                 'password' => 'rahasia123',
             ])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['role']);
    }
}
