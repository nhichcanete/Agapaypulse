<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_news2_scale_one_check_in_rejects_patients_under_sixteen(): void
    {
        $patient = Patient::create([
            'full_name' => 'Young Patient',
            'birth_date' => now()->subYears(15)->toDateString(),
        ]);
        $resident = User::create([
            'name' => 'Young Patient',
            'email' => 'young@example.com',
            'role' => 'resident',
            'patient_id' => $patient->id,
            'password' => 'test-password',
        ]);

        $this->actingAs($resident, 'sanctum')
            ->postJson('/api/triage/check-in', [
                'chief_complaint' => 'Routine visit',
                'respiratory_rate' => 16,
                'bp_systolic' => 120,
                'temperature' => 37,
                'heart_rate' => 80,
                'spo2' => 98,
                'consciousness' => 'alert',
                'supplemental_oxygen' => false,
                'news2_applicable' => true,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Online check-in is available to adults aged 16 or older who are not pregnant. Please contact or visit the health center for help with other check-ins.');

        $this->assertDatabaseCount('queues', 0);
    }

    public function test_remote_ticket_requires_arrival_confirmation_before_calling(): void
    {
        $patient = Patient::create([
            'full_name' => 'Resident Patient',
            'birth_date' => '1985-03-10',
        ]);
        $resident = User::create([
            'name' => 'Resident Patient',
            'email' => 'resident@example.com',
            'phone' => '09170000001',
            'role' => 'resident',
            'patient_id' => $patient->id,
            'password' => 'test-password',
        ]);
        $staff = User::create([
            'name' => 'Health Worker',
            'email' => 'staff@example.com',
            'role' => 'staff',
            'password' => 'test-password',
        ]);

        $this->actingAs($resident, 'sanctum')
            ->getJson('/api/my-queue')
            ->assertNoContent();

        $this->actingAs($resident, 'sanctum')
            ->postJson('/api/triage/check-in', [
                'chief_complaint' => 'Routine cough',
                'respiratory_rate' => 16,
                'bp_systolic' => 120,
                'bp_diastolic' => 80,
                'temperature' => 37.1,
                'heart_rate' => 80,
                'spo2' => 98,
                'consciousness' => 'alert',
                'supplemental_oxygen' => false,
                'news2_applicable' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('status', 'pre_registered')
            ->assertJsonPath('arrival_confirmed', false)
            ->assertJsonPath('news2_score', 0)
            ->assertJsonPath('severity', 'Low')
            ->assertJsonPath('respiratory_rate', 16)
            ->assertJsonPath('consciousness', 'alert')
            ->assertJsonPath('supplemental_oxygen', false);

        $this->actingAs($resident, 'sanctum')
            ->postJson('/api/triage/check-in', [
                'chief_complaint' => 'Second ticket',
                'respiratory_rate' => 16,
                'bp_systolic' => 120,
                'temperature' => 37,
                'heart_rate' => 80,
                'spo2' => 98,
                'consciousness' => 'alert',
                'supplemental_oxygen' => false,
                'news2_applicable' => true,
            ])
            ->assertStatus(409);

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/queue')
            ->assertOk()
            ->assertJsonPath('pending_arrivals.0.status', 'pre_registered');

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/queue/call-next', ['stream' => 'A', 'desk_number' => 1])
            ->assertNotFound();

        $entranceCode = $this->actingAs($staff, 'sanctum')
            ->getJson('/api/queue/entrance-code')
            ->assertOk()
            ->json('code');

        $this->actingAs($resident, 'sanctum')
            ->postJson('/api/confirm-arrival', ['entrance_code' => $entranceCode])
            ->assertOk()
            ->assertJsonPath('queue.status', 'waiting')
            ->assertJsonPath('queue.estimated_wait_minutes', 0);

        $calledTicket = $this->actingAs($staff, 'sanctum')
            ->postJson('/api/queue/call-next', ['stream' => 'A', 'desk_number' => 1])
            ->assertOk()
            ->assertJsonPath('status', 'called');

        $this->travel(1)->days();

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/queue')
            ->assertOk()
            ->assertJsonPath('queue.0.id', $calledTicket->json('id'))
            ->assertJsonPath('queue.0.status', 'called');

        $this->getJson('/api/display')
            ->assertOk()
            ->assertJsonPath('now_serving.0.id', $calledTicket->json('id'));

        $this->actingAs($resident, 'sanctum')
            ->getJson('/api/my-queue')
            ->assertOk()
            ->assertJsonPath('id', $calledTicket->json('id'))
            ->assertJsonPath('status', 'called');

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/queue/call-next', ['stream' => 'A', 'desk_number' => 1])
            ->assertStatus(409)
            ->assertJsonPath('message', 'Complete or mark the current patient as no-show before calling another ticket.');
    }

    public function test_unresponsive_resident_is_assigned_emergency_queue_severity(): void
    {
        $patient = Patient::create([
            'full_name' => 'Unresponsive Resident',
            'birth_date' => '1985-03-10',
        ]);
        $resident = User::create([
            'name' => 'Unresponsive Resident',
            'email' => 'unresponsive@example.com',
            'role' => 'resident',
            'patient_id' => $patient->id,
            'password' => 'test-password',
        ]);

        $this->actingAs($resident, 'sanctum')
            ->postJson('/api/triage/check-in', [
                'chief_complaint' => 'Not responding',
                'respiratory_rate' => 16,
                'bp_systolic' => 120,
                'bp_diastolic' => 80,
                'temperature' => 37,
                'heart_rate' => 80,
                'spo2' => 98,
                'consciousness' => 'unresponsive',
                'supplemental_oxygen' => false,
                'news2_applicable' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('severity', 'Emergency')
            ->assertJsonPath('news2_score', 3);
    }

    public function test_severe_optional_diastolic_reading_raises_queue_priority(): void
    {
        $patient = Patient::create([
            'full_name' => 'High Diastolic Resident',
            'birth_date' => '1985-03-10',
        ]);
        $resident = User::create([
            'name' => 'High Diastolic Resident',
            'email' => 'high-diastolic@example.com',
            'role' => 'resident',
            'patient_id' => $patient->id,
            'password' => 'test-password',
        ]);

        $this->actingAs($resident, 'sanctum')
            ->postJson('/api/triage/check-in', [
                'chief_complaint' => 'Routine check-in',
                'respiratory_rate' => 16,
                'bp_systolic' => 120,
                'bp_diastolic' => 120,
                'temperature' => 37,
                'heart_rate' => 80,
                'spo2' => 98,
                'consciousness' => 'alert',
                'supplemental_oxygen' => false,
                'news2_applicable' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('severity', 'High')
            ->assertJsonPath('news2_score', 0);
    }
}
