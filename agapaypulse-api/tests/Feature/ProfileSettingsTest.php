<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfileSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_can_update_contact_and_patient_profile_without_changing_role_or_priority_verification(): void
    {
        $patient = Patient::create([
            'full_name' => 'Resident User',
            'birth_date' => '1990-01-01',
            'priority_verified' => true,
            'priority_verified_at' => now(),
        ]);
        $user = User::create([
            'name' => 'Resident User',
            'email' => 'resident@example.com',
            'phone' => '09170000001',
            'role' => 'resident',
            'patient_id' => $patient->id,
            'password' => 'test-password',
        ]);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile', [
                'name' => 'Updated Resident',
                'email' => 'updated@example.com',
                'phone' => '09170000002',
                'birth_date' => '1991-02-03',
                'sex' => 'Female',
                'philhealth_no' => 'PH-123456',
                'id_type' => 'PWD',
                'id_number' => 'PWD-999',
                'role' => 'admin',
                'priority_verified' => false,
            ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Updated Resident')
            ->assertJsonPath('user.role', 'resident')
            ->assertJsonPath('user.patient.full_name', 'Updated Resident')
            ->assertJsonPath('user.patient.philhealth_no', 'PH-123456')
            ->assertJsonPath('user.patient.id_type', null)
            ->assertJsonPath('user.patient.priority_verified', true);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'profile.updated',
            'entity' => 'user',
            'entity_id' => $user->id,
        ]);
    }

    public function test_user_can_change_password_after_current_password_check(): void
    {
        $user = User::create([
            'name' => 'Staff User',
            'email' => 'staff@example.com',
            'role' => 'staff',
            'password' => 'current-password',
        ]);
        $token = $user->createToken('profile-settings')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/profile/password', [
                'current_password' => 'wrong-password',
                'password' => 'new-password-123',
                'password_confirmation' => 'new-password-123',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The current password is incorrect.');

        $this->withToken($token)
            ->putJson('/api/profile/password', [
                'current_password' => 'current-password',
                'password' => 'new-password-123',
                'password_confirmation' => 'new-password-123',
            ])
            ->assertOk();

        $this->assertTrue(Hash::check('new-password-123', $user->fresh()->password));
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'profile.password_changed',
            'entity_id' => $user->id,
        ]);
    }
}
