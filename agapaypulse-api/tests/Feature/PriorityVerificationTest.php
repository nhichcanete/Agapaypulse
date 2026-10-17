<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PriorityVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_can_submit_private_priority_id_image_for_admin_review(): void
    {
        Storage::fake('local');
        [$resident, $patient] = $this->createResident();

        $response = $this->actingAs($resident, 'sanctum')
            ->post('/api/priority-verification', [
                'id_type' => 'PWD',
                'id_number' => 'PWD-123',
                'document' => UploadedFile::fake()->image('priority-id.png'),
            ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('patient.priority_document_status', 'pending')
            ->assertJsonPath('patient.priority_verified', false)
            ->assertJsonMissingPath('patient.priority_document_path');

        $storedPatient = $patient->fresh();
        $this->assertSame('PWD', $storedPatient->id_type);
        $this->assertSame('pending', $storedPatient->priority_document_status);
        Storage::disk('local')->assertExists($storedPatient->priority_document_path);

        $this->actingAs($resident, 'sanctum')
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonMissingPath('patient.priority_document_path');
    }

    public function test_only_admins_can_review_submissions_and_private_documents(): void
    {
        Storage::fake('local');
        [$resident, $patient] = $this->createResident();
        $patient->update([
            'id_type' => 'Senior Citizen',
            'priority_document_path' => UploadedFile::fake()->image('id.png')->store("priority-documents/{$patient->id}", 'local'),
            'priority_document_status' => 'pending',
        ]);
        $staff = $this->createAccount('staff', 'priority-staff@example.com');
        $admin = $this->createAccount('admin', 'priority-admin@example.com');

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/priority-verifications')
            ->assertForbidden();
        $this->actingAs($staff, 'sanctum')
            ->getJson("/api/priority-verifications/{$patient->id}/document")
            ->assertForbidden();
        $this->actingAs($staff, 'sanctum')
            ->postJson("/api/priority-verifications/{$patient->id}/review", ['status' => 'approved'])
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/priority-verifications')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id_type', 'Senior Citizen');

        $this->actingAs($admin, 'sanctum')
            ->get("/api/priority-verifications/{$patient->id}/document")
            ->assertOk()
            ->assertHeader('content-type', 'image/png');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/priority-verifications/{$patient->id}/review", ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('status', 'approved');

        $this->assertTrue($patient->fresh()->priority_verified);
        $this->assertNotNull($patient->fresh()->priority_verified_at);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $admin->id,
            'action' => 'priority_verification.approved',
            'entity_id' => $patient->id,
        ]);

        $this->actingAs($resident, 'sanctum')
            ->getJson('/api/priority-verifications')
            ->assertForbidden();
    }

    public function test_declined_submission_requires_a_reason_and_resident_can_resubmit(): void
    {
        Storage::fake('local');
        [$resident, $patient] = $this->createResident();
        $patient->update([
            'id_type' => 'PWD',
            'priority_document_path' => UploadedFile::fake()->image('id.png')->store("priority-documents/{$patient->id}", 'local'),
            'priority_document_status' => 'pending',
        ]);
        $admin = $this->createAccount('admin', 'priority-review-admin@example.com');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/priority-verifications/{$patient->id}/review", ['status' => 'rejected'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['note']);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/priority-verifications/{$patient->id}/review", [
                'status' => 'rejected',
                'note' => 'Please upload a clearer image.',
            ])
            ->assertOk();

        $this->assertFalse($patient->fresh()->priority_verified);
        $this->assertSame('Please upload a clearer image.', $patient->fresh()->priority_review_note);

        $this->actingAs($resident, 'sanctum')
            ->post('/api/priority-verification', [
                'id_type' => 'PWD',
                'document' => UploadedFile::fake()->image('replacement.png'),
            ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('patient.priority_document_status', 'pending')
            ->assertJsonPath('patient.priority_review_note', null);
    }

    private function createResident(): array
    {
        $patient = Patient::create(['full_name' => 'Priority Resident']);
        $resident = User::create([
            'name' => 'Priority Resident',
            'email' => 'priority-resident@example.com',
            'role' => 'resident',
            'patient_id' => $patient->id,
            'password' => 'test-password',
        ]);

        return [$resident, $patient];
    }

    private function createAccount(string $role, string $email): User
    {
        return User::create([
            'name' => ucfirst($role),
            'email' => $email,
            'role' => $role,
            'password' => 'test-password',
        ]);
    }
}
