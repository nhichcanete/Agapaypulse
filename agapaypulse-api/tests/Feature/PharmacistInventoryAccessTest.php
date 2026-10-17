<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Medicine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PharmacistInventoryAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_pharmacist_can_create_and_adjust_stock_with_audit_and_stock_logs(): void
    {
        $pharmacist = User::create([
            'name' => 'Pharmacist',
            'email' => 'pharmacist@example.com',
            'role' => 'pharmacist',
            'password' => 'test-password',
        ]);

        $created = $this->actingAs($pharmacist, 'sanctum')
            ->postJson('/api/medicines', [
                'medicine_name' => 'Amlodipine',
                'generic_name' => 'Amlodipine',
                'dosage' => '5mg',
                'category' => 'Maintenance',
                'stock_quantity' => 20,
                'max_per_release' => 5,
                'reorder_level' => 4,
                'unit' => 'tablets',
            ])
            ->assertCreated()
            ->assertJsonPath('medicine.stock_quantity', 20);

        $medicineId = $created->json('medicine.id');

        $this->actingAs($pharmacist, 'sanctum')
            ->putJson("/api/medicines/{$medicineId}", [
                'medicine_name' => 'Amlodipine',
                'generic_name' => 'Amlodipine',
                'dosage' => '5mg',
                'category' => 'Maintenance',
                'stock_quantity' => 25,
                'max_per_release' => 5,
                'reorder_level' => 4,
                'unit' => 'tablets',
                'expiry_date' => null,
                'description' => null,
            ])
            ->assertOk()
            ->assertJsonPath('medicine.stock_quantity', 25);

        $this->assertDatabaseHas('stock_logs', [
            'medicine_id' => $medicineId,
            'user_id' => $pharmacist->id,
            'type' => 'add',
            'quantity' => 20,
        ]);
        $this->assertDatabaseHas('stock_logs', [
            'medicine_id' => $medicineId,
            'user_id' => $pharmacist->id,
            'type' => 'add',
            'quantity' => 5,
            'remarks' => 'Manual stock adjustment',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $pharmacist->id,
            'action' => 'medicine.created',
            'entity_id' => $medicineId,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $pharmacist->id,
            'action' => 'medicine.updated',
            'entity_id' => $medicineId,
        ]);
    }

    public function test_resident_cannot_change_inventory_and_reserved_stock_cannot_be_removed(): void
    {
        $resident = User::create([
            'name' => 'Resident',
            'email' => 'resident@example.com',
            'role' => 'resident',
            'password' => 'test-password',
        ]);
        $medicine = Medicine::create([
            'medicine_name' => 'Metformin',
            'generic_name' => 'Metformin',
            'dosage' => '500mg',
            'category' => 'Maintenance',
            'stock_quantity' => 10,
            'reserved_quantity' => 4,
            'max_per_release' => 5,
            'reorder_level' => 2,
            'unit' => 'tablets',
        ]);

        $this->actingAs($resident, 'sanctum')
            ->putJson("/api/medicines/{$medicine->id}", [
                'medicine_name' => 'Metformin',
                'generic_name' => 'Metformin',
                'dosage' => '500mg',
                'category' => 'Maintenance',
                'stock_quantity' => 8,
                'max_per_release' => 5,
                'reorder_level' => 2,
                'unit' => 'tablets',
                'expiry_date' => null,
                'description' => null,
            ])
            ->assertForbidden();

        $pharmacist = User::create([
            'name' => 'Pharmacist',
            'email' => 'pharmacist@example.com',
            'role' => 'pharmacist',
            'password' => 'test-password',
        ]);

        $this->actingAs($pharmacist, 'sanctum')
            ->putJson("/api/medicines/{$medicine->id}", [
                'medicine_name' => 'Metformin',
                'generic_name' => 'Metformin',
                'dosage' => '500mg',
                'category' => 'Maintenance',
                'stock_quantity' => 3,
                'max_per_release' => 5,
                'reorder_level' => 2,
                'unit' => 'tablets',
                'expiry_date' => null,
                'description' => null,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Stock cannot be reduced below the quantity reserved for residents.');
    }

    public function test_admin_can_open_audit_entry_with_its_linked_medicine_record(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'role' => 'admin',
            'password' => 'test-password',
        ]);
        $medicine = Medicine::create([
            'medicine_name' => 'Losartan',
            'generic_name' => 'Losartan Potassium',
            'dosage' => '50mg',
            'category' => 'Maintenance',
            'stock_quantity' => 25,
            'reserved_quantity' => 0,
            'max_per_release' => 10,
            'reorder_level' => 5,
            'unit' => 'tablets',
        ]);
        $log = AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'medicine.updated',
            'entity' => 'medicine',
            'entity_id' => $medicine->id,
            'metadata' => ['stock_before' => 20, 'stock_after' => 25],
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/audit-logs/{$log->id}")
            ->assertOk()
            ->assertJsonPath('log.id', $log->id)
            ->assertJsonPath('record.id', $medicine->id)
            ->assertJsonPath('record.medicine_name', 'Losartan')
            ->assertJsonPath('log.metadata.stock_after', 25);
    }
}
