<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * Password default yang digunakan oleh factory.
     */
    protected static ?string $password;

    /**
     * Definisi state default model.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name'           => fake()->name(),
            'username'       => fake()->unique()->userName(),
            'password'       => static::$password ??= Hash::make('password'),
            'role'           => 'Supervisor',
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * State: pengguna dengan role Admin.
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'Admin',
        ]);
    }

    /**
     * State: pengguna dengan role Management.
     */
    public function management(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'Management',
        ]);
    }

    /**
     * State: pengguna dengan role Supervisor (default).
     */
    public function supervisor(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'Supervisor',
        ]);
    }
}
