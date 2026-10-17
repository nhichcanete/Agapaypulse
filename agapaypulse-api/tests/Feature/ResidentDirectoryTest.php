<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\Queue;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResidentDirectoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_admin_and_pharmacist_can_view_registered_residents_but_residents_cannot(): void
    {
        $patient = Patient::create(['full_name' => 'Registered Resident']);
        $residentAccount = User::create([
            'name' => 'Registered Resident',
            'email' => 'resident@example.com',
            'role' => 'resident',
            'patient_id' => $patient->id,
            'password' => 'test-password',
        ]);

        foreach (['staff', 'admin', 'pharmacist'] as $role) {
            $viewer = User::create([
                'name' => ucfirst($role),
                'email' => "{$role}@example.com",
                'role' => $role,
                'password' => 'test-password',
            ]);

            $this->actingAs($viewer, 'sanctum')
                ->getJson('/api/resident-directory')
                ->assertOk()
                ->assertJsonPath('meta.total', 1)
                ->assertJsonPath('data.0.name', 'Registered Resident')
                ->assertJsonMissingPath('data.0.email')
                ->assertJsonMissingPath('data.0.phone');
        }

        $this->actingAs($residentAccount, 'sanctum')
            ->getJson('/api/resident-directory')
            ->assertForbidden();
    }

    public function test_directory_filters_registered_residents_by_priority_age_queue_status_severity_and_search(): void
    {
        $senior = Patient::create([
            'full_name' => 'Maria Senior',
            'birth_date' => now()->subYears(70)->toDateString(),
            'id_type' => 'Senior Citizen',
            'priority_verified' => true,
        ]);
        $adult = Patient::create([
            'full_name' => 'Juan Adult',
            'birth_date' => now()->subYears(30)->toDateString(),
        ]);
        $unregisteredPatient = Patient::create(['full_name' => 'No Account Patient']);

        $seniorAccount = User::create([
            'name' => 'Maria Senior',
            'email' => 'maria@example.com',
            'role' => 'resident',
            'patient_id' => $senior->id,
            'password' => 'test-password',
        ]);
        User::create([
            'name' => 'Juan Adult',
            'email' => 'juan@example.com',
            'role' => 'resident',
            'patient_id' => $adult->id,
            'password' => 'test-password',
        ]);
        User::create([
            'name' => 'Staff account',
            'email' => 'staff@example.com',
            'role' => 'staff',
            'password' => 'test-password',
        ]);

        Queue::create([
            'patient_id' => $senior->id,
            'queue_number' => 'A-501',
            'stream' => 'A',
            'sequence_number' => 501,
            'status' => 'waiting',
            'severity' => 'High',
            'arrival_confirmed' => true,
        ]);
        Queue::create([
            'patient_id' => $adult->id,
            'queue_number' => 'A-502',
            'stream' => 'A',
            'sequence_number' => 502,
            'status' => 'completed',
            'severity' => 'Low',
            'arrival_confirmed' => true,
        ]);

        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'role' => 'admin',
            'password' => 'test-password',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/resident-directory?priority=priority&age_group=60_plus&queue_status=waiting&severity=High&search=A-501')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $seniorAccount->id)
            ->assertJsonPath('data.0.name', 'Maria Senior')
            ->assertJsonPath('data.0.priority_label', 'Senior Citizen')
            ->assertJsonPath('data.0.priority_verified', true)
            ->assertJsonPath('data.0.queue.ticket', 'A-501')
            ->assertJsonPath('data.0.queue.status', 'waiting')
            ->assertJsonPath('data.0.queue.severity', 'High');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/resident-directory?queue_status=none&age_group=18_59')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
    }

    public function test_invalid_directory_filters_are_rejected(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'role' => 'admin',
            'password' => 'test-password',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/resident-directory?queue_status=active&age_group=unknown-age')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['queue_status', 'age_group']);
    }

    public function test_self_declared_priority_id_does_not_make_a_resident_priority_until_verified(): void
    {
        $patient = Patient::create([
            'full_name' => 'Unverified PWD',
            'birth_date' => now()->subYears(30)->toDateString(),
            'id_type' => 'PWD',
            'priority_verified' => false,
        ]);
        User::create([
            'name' => 'Unverified PWD',
            'email' => 'unverified@example.com',
            'role' => 'resident',
            'patient_id' => $patient->id,
            'password' => 'test-password',
        ]);
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'priority-filter-admin@example.com',
            'role' => 'admin',
            'password' => 'test-password',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/resident-directory?priority=priority')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
    }
}
