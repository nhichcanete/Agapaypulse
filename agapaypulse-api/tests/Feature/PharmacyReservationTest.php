<?php

namespace Tests\Feature;

use App\Models\Medicine;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PharmacyReservationTest extends TestCase
{
    use RefreshDatabase;

    public function test_reservation_holds_stock_and_claim_decrements_it_once(): void
    {
        $patient = Patient::create(['full_name' => 'Resident Patient']);
        $resident = User::create([
            'name' => 'Resident Patient',
            'email' => 'resident@example.com',
            'phone' => '09170000002',
            'role' => 'resident',
            'patient_id' => $patient->id,
            'password' => 'test-password',
        ]);
        $pharmacist = User::create([
            'name' => 'Pharmacist',
            'email' => 'pharmacist@example.com',
            'role' => 'pharmacist',
            'password' => 'test-password',
        ]);
        $medicine = Medicine::create([
            'medicine_name' => 'Amlodipine',
            'generic_name' => 'Amlodipine',
            'dosage' => '5mg',
            'category' => 'Maintenance',
            'stock_quantity' => 10,
            'reserved_quantity' => 0,
            'max_per_release' => 5,
            'reorder_level' => 2,
            'unit' => 'tablets',
        ]);
        $consultPatient = Patient::create(['full_name' => 'Private Consultation Resident']);
        Queue::create([
            'patient_id' => $consultPatient->id,
            'queue_number' => 'A-101',
            'stream' => 'A',
            'sequence_number' => 101,
            'status' => 'waiting',
            'severity' => 'Low',
            'arrival_confirmed' => true,
        ]);

        $reservation = $this->actingAs($resident, 'sanctum')
            ->postJson('/api/reservations', [
                'medicine_id' => $medicine->id,
                'quantity' => 3,
            ])
            ->assertCreated()
            ->assertJsonPath('status', 'pending');

        $this->assertDatabaseHas('medicines', [
            'id' => $medicine->id,
            'stock_quantity' => 10,
            'reserved_quantity' => 3,
        ]);

        $this->actingAs($resident, 'sanctum')
            ->getJson('/api/my-reservations')
            ->assertOk()
            ->assertJsonPath('0.id', $reservation->json('id'))
            ->assertJsonPath('0.status', 'pending')
            ->assertJsonPath('0.medicine.medicine_name', 'Amlodipine');

        $this->actingAs($pharmacist, 'sanctum')
            ->getJson('/api/pharmacy/reservations')
            ->assertOk()
            ->assertJsonPath('0.id', $reservation->json('id'))
            ->assertJsonPath('0.patient.full_name', 'Resident Patient')
            ->assertJsonPath('0.medicine.medicine_name', 'Amlodipine');

        $pickupCode = $reservation->json('pickup_code');
        $review = $this->actingAs($pharmacist, 'sanctum')
            ->postJson('/api/pharmacy/lookup-claim', ['pickup_code' => $pickupCode])
            ->assertOk()
            ->assertJsonPath('reservation.pickup_code', $pickupCode)
            ->assertJsonPath('reservation.patient_name', 'Resident Patient')
            ->assertJsonPath('reservation.medicine_name', 'Amlodipine')
            ->assertJsonPath('queue.stream', 'B')
            ->assertJsonPath('queue.status', 'waiting');

        $this->actingAs($pharmacist, 'sanctum')
            ->getJson('/api/queue')
            ->assertOk()
            ->assertJsonCount(1, 'queue')
            ->assertJsonPath('queue.0.stream', 'B')
            ->assertDontSee('Private Consultation Resident');

        $this->actingAs($pharmacist, 'sanctum')
            ->postJson('/api/queue/call-next', ['stream' => 'A', 'desk_number' => 1])
            ->assertForbidden();

        $this->actingAs($pharmacist, 'sanctum')
            ->postJson('/api/pharmacy/lookup-claim', ['pickup_code' => $pickupCode])
            ->assertOk()
            ->assertJsonPath('queue.id', $review->json('queue.id'))
            ->assertJsonPath('queue.queue_number', $review->json('queue.queue_number'));

        $this->actingAs($pharmacist, 'sanctum')
            ->postJson('/api/queue/call-next', ['stream' => 'B', 'desk_number' => 1])
            ->assertOk()
            ->assertJsonPath('status', 'called')
            ->assertJsonPath('reservation.pickup_code', $pickupCode);

        $this->actingAs($pharmacist, 'sanctum')
            ->postJson('/api/queue/skip', ['queue_id' => $review->json('queue.id')])
            ->assertOk();

        $requeued = $this->actingAs($pharmacist, 'sanctum')
            ->postJson('/api/pharmacy/lookup-claim', ['pickup_code' => $pickupCode])
            ->assertOk()
            ->assertJsonPath('queue.status', 'waiting');
        $this->assertNotSame($review->json('queue.id'), $requeued->json('queue.id'));

        $this->actingAs($pharmacist, 'sanctum')
            ->postJson('/api/pharmacy/complete-pickup', ['queue_id' => $review->json('queue.id')])
            ->assertStatus(409);

        $this->actingAs($pharmacist, 'sanctum')
            ->postJson('/api/queue/call-next', ['stream' => 'B', 'desk_number' => 1])
            ->assertOk()
            ->assertJsonPath('id', $requeued->json('queue.id'))
            ->assertJsonPath('status', 'called');

        $this->actingAs($pharmacist, 'sanctum')
            ->postJson('/api/pharmacy/complete-pickup', ['queue_id' => $requeued->json('queue.id')])
            ->assertOk()
            ->assertJsonPath('status', 'claimed');

        $this->assertDatabaseHas('queues', [
            'id' => $requeued->json('queue.id'),
            'stream' => 'B',
            'status' => 'completed',
        ]);

        $this->assertDatabaseHas('medicines', [
            'id' => $medicine->id,
            'stock_quantity' => 7,
            'reserved_quantity' => 0,
        ]);

        $this->actingAs($pharmacist, 'sanctum')
            ->postJson('/api/pharmacy/complete-pickup', ['queue_id' => $requeued->json('queue.id')])
            ->assertStatus(409);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'reservation.created',
            'entity' => 'reservation',
            'entity_id' => $reservation->json('id'),
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'reservation.qr_scanned',
            'entity' => 'reservation',
            'entity_id' => $reservation->json('id'),
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'reservation.pickup_queued',
            'entity' => 'reservation',
            'entity_id' => $reservation->json('id'),
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'reservation.claimed',
            'entity' => 'reservation',
            'entity_id' => $reservation->json('id'),
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'queue.completed',
            'entity' => 'queue',
            'entity_id' => $requeued->json('queue.id'),
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'reservation.pickup_no_show',
            'entity' => 'reservation',
            'entity_id' => $reservation->json('id'),
        ]);
    }

    public function test_expired_reservation_releases_held_stock_on_inventory_refresh(): void
    {
        $patient = Patient::create(['full_name' => 'Resident Patient']);
        $resident = User::create([
            'name' => 'Resident Patient',
            'email' => 'resident@example.com',
            'phone' => '09170000003',
            'role' => 'resident',
            'patient_id' => $patient->id,
            'password' => 'test-password',
        ]);
        $medicine = Medicine::create([
            'medicine_name' => 'Metformin',
            'generic_name' => 'Metformin',
            'dosage' => '500mg',
            'category' => 'Maintenance',
            'stock_quantity' => 10,
            'reserved_quantity' => 0,
            'max_per_release' => 5,
            'reorder_level' => 2,
            'unit' => 'tablets',
        ]);

        $reservation = $this->actingAs($resident, 'sanctum')
            ->postJson('/api/reservations', ['medicine_id' => $medicine->id, 'quantity' => 3])
            ->assertCreated();

        $this->travel(25)->hours();
        $this->actingAs($resident, 'sanctum')->getJson('/api/medicines')->assertOk();

        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->json('id'),
            'status' => 'expired',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'reservation.expired',
            'entity' => 'reservation',
            'entity_id' => $reservation->json('id'),
        ]);
        $this->assertDatabaseHas('medicines', [
            'id' => $medicine->id,
            'stock_quantity' => 10,
            'reserved_quantity' => 0,
        ]);
    }

    public function test_pickup_checked_in_before_expiry_remains_queued_and_can_be_completed(): void
    {
        $patient = Patient::create(['full_name' => 'Queued Resident']);
        $resident = User::create([
            'name' => 'Queued Resident',
            'email' => 'queued-resident@example.com',
            'role' => 'resident',
            'patient_id' => $patient->id,
            'password' => 'test-password',
        ]);
        $pharmacist = User::create([
            'name' => 'Pharmacist',
            'email' => 'pharmacist@example.com',
            'role' => 'pharmacist',
            'password' => 'test-password',
        ]);
        $medicine = Medicine::create([
            'medicine_name' => 'Metformin',
            'generic_name' => 'Metformin',
            'dosage' => '500mg',
            'category' => 'Maintenance',
            'stock_quantity' => 10,
            'reserved_quantity' => 0,
            'max_per_release' => 5,
            'reorder_level' => 2,
            'unit' => 'tablets',
        ]);
        $reservation = $this->actingAs($resident, 'sanctum')
            ->postJson('/api/reservations', ['medicine_id' => $medicine->id, 'quantity' => 2])
            ->assertCreated();
        $queue = $this->actingAs($pharmacist, 'sanctum')
            ->postJson('/api/pharmacy/lookup-claim', ['pickup_code' => $reservation->json('pickup_code')])
            ->assertOk()
            ->json('queue');

        $this->travel(25)->hours();

        $this->actingAs($pharmacist, 'sanctum')
            ->getJson('/api/pharmacy/reservations')
            ->assertOk()
            ->assertJsonPath('0.id', $reservation->json('id'))
            ->assertJsonPath('0.queues.0.id', $queue['id']);

        $this->actingAs($pharmacist, 'sanctum')
            ->getJson('/api/queue')
            ->assertOk()
            ->assertJsonPath('queue.0.id', $queue['id'])
            ->assertJsonPath('queue.0.status', 'waiting');

        $this->actingAs($pharmacist, 'sanctum')
            ->postJson('/api/queue/call-next', ['stream' => 'B', 'desk_number' => 1])
            ->assertOk()
            ->assertJsonPath('id', $queue['id']);

        $this->actingAs($pharmacist, 'sanctum')
            ->postJson('/api/pharmacy/complete-pickup', ['queue_id' => $queue['id']])
            ->assertOk()
            ->assertJsonPath('status', 'claimed');

        $this->assertDatabaseHas('medicines', [
            'id' => $medicine->id,
            'stock_quantity' => 8,
            'reserved_quantity' => 0,
        ]);
    }
}
