<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Patient;
use App\Models\Queue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicDisplayTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_display_shows_ticket_data_without_patient_details(): void
    {
        $patient = Patient::create(['full_name' => 'Private Resident Name']);
        Queue::create([
            'patient_id' => $patient->id,
            'queue_number' => 'A-101',
            'stream' => 'A',
            'sequence_number' => 101,
            'desk_number' => 2,
            'status' => 'called',
            'severity' => 'Low',
            'arrival_confirmed' => true,
            'called_at' => now(),
        ]);
        Announcement::create(['message' => 'Clinic closes at 4:00 PM.', 'active' => true]);

        $this->getJson('/api/display')
            ->assertOk()
            ->assertJsonPath('now_serving.0.queue_number', 'A-101')
            ->assertJsonPath('now_serving.0.desk_number', 2)
            ->assertJsonPath('announcements.0', 'Clinic closes at 4:00 PM.')
            ->assertJsonMissingPath('now_serving.0.patient')
            ->assertDontSee('Private Resident Name');
    }
}