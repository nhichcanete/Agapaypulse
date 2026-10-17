<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogClearTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_delete_only_activity_logs_matching_selected_filters(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'role' => 'admin',
            'password' => 'test-password',
        ]);
        $matchingFirst = AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'reservation.created',
            'entity' => 'reservation',
            'entity_id' => 10,
        ]);
        $matchingSecond = AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'reservation.created',
            'entity' => 'reservation',
            'entity_id' => 11,
        ]);
        $unmatched = AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'reservation.claimed',
            'entity' => 'reservation',
            'entity_id' => 12,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/audit-logs?action=reservation.created', [
                'confirmation' => 'DELETE MATCHING LOGS',
            ])
            ->assertOk()
            ->assertJsonPath('deleted_count', 2);

        $this->assertDatabaseMissing('audit_logs', ['id' => $matchingFirst->id]);
        $this->assertDatabaseMissing('audit_logs', ['id' => $matchingSecond->id]);
        $this->assertDatabaseHas('audit_logs', ['id' => $unmatched->id]);
    }

    public function test_clear_requires_a_filter_and_exact_typed_confirmation(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'role' => 'admin',
            'password' => 'test-password',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/audit-logs', ['confirmation' => 'DELETE MATCHING LOGS'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Set at least one activity filter before deleting matching logs.');

        $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/audit-logs?action=reservation.created', ['confirmation' => 'DELETE ALL'])
            ->assertUnprocessable();
    }

    public function test_non_admin_cannot_delete_activity_logs(): void
    {
        $staff = User::create([
            'name' => 'Staff',
            'email' => 'staff@example.com',
            'role' => 'staff',
            'password' => 'test-password',
        ]);
        $log = AuditLog::create([
            'user_id' => $staff->id,
            'action' => 'queue.called',
            'entity' => 'queue',
            'entity_id' => 20,
        ]);

        $this->actingAs($staff, 'sanctum')
            ->deleteJson('/api/audit-logs?action=queue.called', [
                'confirmation' => 'DELETE MATCHING LOGS',
            ])
            ->assertForbidden();

        $this->assertDatabaseHas('audit_logs', ['id' => $log->id]);
    }
}
