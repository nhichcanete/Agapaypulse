<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResidentRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_can_register_and_authenticate(): void
    {
        $response = $this->postJson('/api/register', [
            'full_name' => 'Maria Santos',
            'email' => 'MARIA@example.com',
            'phone' => '09171234567',
            'birth_date' => '1988-04-12',
            'sex' => 'Female',
            'password' => 'HealthCenter123',
            'password_confirmation' => 'HealthCenter123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.email', 'maria@example.com')
            ->assertJsonPath('user.role', 'resident')
            ->assertJsonStructure(['token', 'user' => ['patient_id', 'patient' => ['full_name']]]);

        $this->withToken($response->json('token'))
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('email', 'maria@example.com');
    }
}