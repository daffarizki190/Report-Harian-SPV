<?php

namespace Database\Factories;

use App\Models\Report;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Report>
 */
class ReportFactory extends Factory
{
    protected $model = Report::class;

    /**
     * Definisi state default model laporan.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'spv_name'       => fake()->name(),
            'report_date'    => fake()->dateTimeBetween('-30 days', 'now')->format('Y-m-d'),
            'shift'          => fake()->randomElement(['Pagi', 'Siang', 'Malam']),
            'description'    => fake()->optional()->sentence(),
            'manual_content' => fake()->optional()->paragraph(),
            'file_path'      => null,
        ];
    }

    public function withFile(): static
    {
        return $this->state(function (array $attributes) {
            $reportDate = $attributes['report_date'] ?? fake()->dateTimeBetween('-30 days', 'now')->format('Y-m-d');
            $spvName = $attributes['spv_name'] ?? fake()->name();
            $shift = $attributes['shift'] ?? fake()->randomElement(['Pagi', 'Siang', 'Malam']);

            return [
                'spv_name'    => $spvName,
                'report_date' => $reportDate,
                'shift'       => $shift,
                'file_path'   => sprintf(
                    'REPORTS/%s/%s_%s_%s.pdf',
                    $reportDate,
                    str_replace(' ', '_', $spvName),
                    $reportDate,
                    $shift
                ),
            ];
        });
    }

    /**
     * State: laporan untuk hari ini.
     */
    public function today(): static
    {
        return $this->state(fn (array $attributes) => [
            'report_date' => now()->toDateString(),
        ]);
    }
}
