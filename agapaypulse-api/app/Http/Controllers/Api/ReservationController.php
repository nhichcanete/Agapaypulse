<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use App\Models\Queue;
use App\Models\Reservation;
use App\Models\StockLog;
use App\Services\AuditLogger;
use App\Services\QueueService;
use App\Services\ReservationExpiryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReservationController extends Controller
{
    public function __construct(
        private ReservationExpiryService $reservationExpiry,
        private AuditLogger $auditLogger,
        private QueueService $queueService,
    ) {}

    public function store(Request $request)
    {
        $this->reservationExpiry->releaseExpired($request->user());
        $validated = $request->validate([
            'medicine_id' => 'required|exists:medicines,id',
            'quantity' => 'required|integer|min:1',
            'pickup_window' => 'nullable|string|max:100',
        ]);

        $user = $request->user();
        if (! $user->patient_id) {
            return response()->json(['message' => 'A resident patient profile is required to reserve medicine.'], 422);
        }

        return DB::transaction(function () use ($validated, $user) {
            $med = Medicine::lockForUpdate()->findOrFail($validated['medicine_id']);

            if ($med->is_expired) {
                return response()->json(['message' => 'This medicine has expired and cannot be reserved.'], 422);
            }

            $availableStock = $med->available_stock;
            if ($availableStock < $validated['quantity']) {
                return response()->json(['message' => 'Insufficient stock available.'], 422);
            }

            if ($validated['quantity'] > $med->max_per_release) {
                return response()->json(['message' => "Maximum allowed quantity is {$med->max_per_release}"], 422);
            }

            $med->increment('reserved_quantity', $validated['quantity']);
            $expiresAt = now()->addHours(24);

            $reservation = Reservation::create([
                'patient_id' => $user->patient_id,
                'medicine_id' => $med->id,
                'quantity' => $validated['quantity'],
                'pickup_code' => 'AP-'.strtoupper(Str::random(8)),
                'pickup_window' => $validated['pickup_window'] ?? 'Within 24 hours',
                'status' => 'pending',
                'expires_at' => $expiresAt,
            ]);

            StockLog::create([
                'medicine_id' => $med->id,
                'user_id' => $user->id,
                'type' => 'reserved',
                'quantity' => $validated['quantity'],
                'remarks' => 'Resident reservation '.$reservation->pickup_code,
            ]);
            $this->auditLogger->record($user, 'reservation.created', 'reservation', $reservation->id, [
                'medicine_id' => $med->id,
                'quantity' => $validated['quantity'],
                'expires_at' => $expiresAt->toIso8601String(),
            ]);

            return response()->json($reservation->load('medicine'), 201);
        });
    }

    public function index(Request $request)
    {
        $this->reservationExpiry->releaseExpired($request->user());

        return response()->json(
            Reservation::with([
                'patient',
                'medicine',
                'queues' => fn ($query) => $query->whereIn('status', ['waiting', 'called'])->latest('id'),
            ])
                ->whereIn('status', ['pending', 'ready'])
                ->where(function ($query) {
                    $query->where('expires_at', '>', now())
                        ->orWhereHas('queues', fn ($activeQueue) => $activeQueue->whereIn('status', ['waiting', 'called']));
                })
                ->orderBy('created_at')
                ->get()
        );
    }

    public function completePickup(Request $request)
    {
        $validated = $request->validate(['queue_id' => 'required|exists:queues,id']);
        $this->reservationExpiry->releaseExpired($request->user());

        return DB::transaction(function () use ($validated, $request) {
            $queue = Queue::query()->lockForUpdate()->findOrFail($validated['queue_id']);

            if ($queue->stream !== 'B' || ! $queue->reservation_id) {
                return response()->json(['message' => 'This ticket is not an express pharmacy pickup.'], 409);
            }

            if ($queue->status !== 'called') {
                return response()->json(['message' => 'Call this pickup ticket before confirming medicine release.'], 409);
            }

            $reservation = Reservation::query()->lockForUpdate()->findOrFail($queue->reservation_id);
            if (! in_array($reservation->status, ['pending', 'ready'], true)) {
                return response()->json(['message' => 'This reservation has already been claimed or cancelled.'], 409);
            }

            $medicine = Medicine::query()->lockForUpdate()->findOrFail($reservation->medicine_id);
            if ($medicine->reserved_quantity < $reservation->quantity || $medicine->stock_quantity < $reservation->quantity) {
                return response()->json(['message' => 'Reserved stock is no longer available. Contact an administrator.'], 409);
            }

            $medicine->decrement('stock_quantity', $reservation->quantity);
            $medicine->decrement('reserved_quantity', $reservation->quantity);
            $reservation->update([
                'status' => 'claimed',
                'verified_by' => $request->user()->id,
            ]);
            $queue->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            StockLog::create([
                'medicine_id' => $medicine->id,
                'user_id' => $request->user()->id,
                'type' => 'deduct',
                'quantity' => $reservation->quantity,
                'remarks' => 'Dispensed reservation '.$reservation->pickup_code,
            ]);
            $this->auditLogger->record($request->user(), 'reservation.claimed', 'reservation', $reservation->id, [
                'medicine_id' => $medicine->id,
                'quantity' => $reservation->quantity,
                'pickup_code' => $reservation->pickup_code,
                'queue_id' => $queue->id,
                'queue_number' => $queue->queue_number,
                'stream' => $queue->stream,
                'desk_number' => $queue->desk_number,
            ]);
            $this->auditLogger->record($request->user(), 'queue.completed', 'queue', $queue->id, [
                'stream' => $queue->stream,
                'desk_number' => $queue->desk_number,
                'reservation_id' => $reservation->id,
                'pickup_code' => $reservation->pickup_code,
            ]);

            return response()->json($reservation->fresh()->load(['patient', 'medicine']));
        });
    }

    public function lookupClaim(Request $request)
    {
        $validated = $request->validate(['pickup_code' => 'required|string|max:32']);
        $this->reservationExpiry->releaseExpired($request->user());
        $reservationId = Reservation::query()
            ->where('pickup_code', strtoupper(trim($validated['pickup_code'])))
            ->value('id');

        if (! $reservationId) {
            return response()->json(['message' => 'Pickup code was not found.'], 404);
        }

        return DB::transaction(function () use ($reservationId, $request) {
            $reservation = Reservation::query()
                ->with(['patient:id,full_name', 'medicine:id,medicine_name,dosage,unit'])
                ->lockForUpdate()
                ->findOrFail($reservationId);

            if (! in_array($reservation->status, ['pending', 'ready'], true)) {
                return response()->json(['message' => 'This reservation has already been claimed or cancelled.'], 409);
            }

            $queue = Queue::query()
                ->where('reservation_id', $reservation->id)
                ->whereIn('status', ['waiting', 'called'])
                ->latest('id')
                ->first();
            $createdQueue = false;

            if (! $queue) {
                if ($reservation->expires_at->isPast()) {
                    return response()->json(['message' => 'This pickup pass has expired.'], 410);
                }

                $queue = $this->queueService->generateTicket($reservation->patient, 'B', [
                    'severity' => 'Low',
                    'chief_complaint' => 'Express pharmacy pickup: '.$reservation->medicine->medicine_name,
                ]);
                $queue->update(['reservation_id' => $reservation->id]);
                $createdQueue = true;
            }

            $metadata = [
                'medicine_id' => $reservation->medicine_id,
                'quantity' => $reservation->quantity,
                'queue_id' => $queue->id,
                'queue_number' => $queue->queue_number,
                'queue_status' => $queue->status,
            ];
            $this->auditLogger->record($request->user(), 'reservation.qr_scanned', 'reservation', $reservation->id, $metadata);

            if ($createdQueue) {
                $this->auditLogger->record($request->user(), 'reservation.pickup_queued', 'reservation', $reservation->id, [
                    'queue_id' => $queue->id,
                    'queue_number' => $queue->queue_number,
                    'stream' => $queue->stream,
                    'medicine_id' => $reservation->medicine_id,
                    'medicine_name' => $reservation->medicine->medicine_name,
                    'quantity' => $reservation->quantity,
                ]);
            }

            return response()->json([
                'reservation' => [
                    'id' => $reservation->id,
                    'pickup_code' => $reservation->pickup_code,
                    'patient_name' => $reservation->patient?->full_name,
                    'medicine_name' => $reservation->medicine?->medicine_name,
                    'dosage' => $reservation->medicine?->dosage,
                    'quantity' => $reservation->quantity,
                    'unit' => $reservation->medicine?->unit,
                    'expires_at' => $reservation->expires_at,
                ],
                'queue' => [
                    'id' => $queue->id,
                    'queue_number' => $queue->queue_number,
                    'status' => $queue->status,
                    'stream' => $queue->stream,
                ],
            ]);
        });
    }

    public function myReservations(Request $request)
    {
        $this->reservationExpiry->releaseExpired($request->user());

        $reservations = Reservation::with('medicine')
            ->where('patient_id', $request->user()->patient_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($reservations);
    }
}
