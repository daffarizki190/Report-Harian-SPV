<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Admin
        User::create([
            'name' => 'Admin Gandaria',
            'username' => 'admin',
            'password' => Hash::make('admin123'),
            'role' => 'Admin',
        ]);

        // Sample Supervisor
        User::create([
            'name' => 'SPV Ahmad',
            'username' => 'spv_ahmad',
            'password' => Hash::make('spv123'),
            'role' => 'Supervisor',
        ]);

        // Sample Management
        User::create([
            'name' => 'Manajer Operasional',
            'username' => 'manager',
            'password' => Hash::make('manager123'),
            'role' => 'Management',
        ]);
    }
}
