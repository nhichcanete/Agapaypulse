<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\Queue;
use App\Models\SoapNote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientVisitHistoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_finalizes_consultation_and_resident_sees_only_their_completed_summary_and_separate_prescriptions(): void
    {
        $patient = Patient::create(['full_name' => 'Resident Patient']);
        $resident = User::create([
            'name' => 'Resident Patient',
            'email' => 'resident@example.com',
            'role' => 'resident',
            'patient_id' => $patient->id,
            'password' => 'test-password',
        ]);
        $staff = User::create([
            'name' => 'Care Team',
            'email' => 'staff@example.com',
            'role' => 'staff',
            'password' => 'test-password',
        ]);
        $queue = Queue::create([
            'patient_id' => $patient->id,
            'queue_number' => 'A-101',
            'stream' => 'A',
            'sequence_number' => 101,
            'status' => 'called',
            'severity' => 'Low',
            'arrival_confirmed' => true,
            'confirmed_at' => now(),
        ]);

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/queue/complete', ['queue_id' => $queue->id])
            ->assertStatus(409)
            ->assertJsonPath('message', 'Finalize the visit note before completing this consultation.');

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/soap-notes', [
                'queue_id' => $queue->id,
                'subjective' => 'Resident reports a mild cough.',
                'objective' => 'Clinician-only objective detail.',
                'assessment' => 'Visit assessment summary.',
                'plan' => 'Rest and follow up if symptoms worsen.',
                'prescriptions' => [[
                    'medication' => 'Demo medicine',
                    'dose' => '500 mg',
                    'route' => 'oral',
                    'frequency' => 'as instructed',
                    'duration' => '3 days',
                    'instructions' => 'Take with water.',
                ]],
            ])
            ->assertCreated();

        $this->assertDatabaseHas('queues', [
            'id' => $queue->id,
            'status' => 'completed',
        ]);
        $this->assertNotNull(SoapNote::where('queue_id', $queue->id)->value('finalized_at'));
        $this->assertDatabaseHas('soap_note_prescriptions', [
            'soap_note_id' => SoapNote::where('queue_id', $queue->id)->value('id'),
            'medication' => 'Demo medicine',
        ]);

        $response = $this->actingAs($resident, 'sanctum')
            ->getJson('/api/my-visits')
            ->assertOk();

        $response
            ->assertJsonPath('visits.0.visit_summary', 'Resident reports a mild cough.')
            ->assertJsonPath('visits.0.assessment', 'Visit assessment summary.')
            ->assertJsonPath('visits.0.prescriptions.0.medication', 'Demo medicine')
            ->assertJsonMissingPath('visits.0.objective')
            ->assertJsonMissing(['Clinician-only objective detail.']);
        $this->assertStringEndsWith('Z', $response->json('visits.0.visit_date'));
    }

    public function test_resident_cannot_read_another_patients_visit_or_write_clinical_notes(): void
    {
        $owner = Patient::create(['full_name' => 'Owner Patient']);
        $other = Patient::create(['full_name' => 'Other Patient']);
        $resident = User::create([
            'name' => 'Other Resident',
            'email' => 'other@example.com',
            'role' => 'resident',
            'patient_id' => $other->id,
            'password' => 'test-password',
        ]);
        $staff = User::create([
            'name' => 'Care Team',
            'email' => 'staff@example.com',
            'role' => 'staff',
            'password' => 'test-password',
        ]);
        $queue = Queue::create([
            'patient_id' => $owner->id,
            'queue_number' => 'A-102',
            'stream' => 'A',
            'sequence_number' => 102,
            'status' => 'completed',
            'severity' => 'Low',
            'arrival_confirmed' => true,
            'confirmed_at' => now(),
            'completed_at' => now(),
        ]);
        SoapNote::create([
            'queue_id' => $queue->id,
            'patient_id' => $owner->id,
            'user_id' => $staff->id,
            'subjective' => 'Owner-only summary.',
            'objective' => 'Private clinician detail.',
            'assessment' => 'Assessment.',
            'plan' => 'Plan.',
            'finalized_at' => now(),
        ]);

        $this->actingAs($resident, 'sanctum')
            ->getJson('/api/my-visits')
            ->assertOk()
            ->assertJsonCount(0, 'visits');

        $this->actingAs($resident, 'sanctum')
            ->postJson('/api/soap-notes', [])
            ->assertForbidden();
    }

    public function test_unfinalized_or_incomplete_visits_are_not_visible_to_resident(): void
    {
        $patient = Patient::create(['full_name' => 'Resident Patient']);
        $resident = User::create([
            'name' => 'Resident Patient',
            'email' => 'resident@example.com',
            'role' => 'resident',
            'patient_id' => $patient->id,
            'password' => 'test-password',
        ]);
        $staff = User::create([
            'name' => 'Care Team',
            'email' => 'staff@example.com',
            'role' => 'staff',
            'password' => 'test-password',
        ]);
        $queue = Queue::create([
            'patient_id' => $patient->id,
            'queue_number' => 'A-103',
            'stream' => 'A',
            'sequence_number' => 103,
            'status' => 'called',
            'severity' => 'Low',
            'arrival_confirmed' => true,
            'confirmed_at' => now(),
        ]);
        SoapNote::create([
            'queue_id' => $queue->id,
            'patient_id' => $patient->id,
            'user_id' => $staff->id,
            'subjective' => 'Draft encounter.',
            'assessment' => 'Draft assessment.',
            'plan' => 'Draft plan.',
        ]);

        $this->actingAs($resident, 'sanctum')
            ->getJson('/api/my-visits')
            ->assertOk()
            ->assertJsonCount(0, 'visits');
    }
}
