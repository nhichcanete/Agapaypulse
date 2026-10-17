<?php

namespace App\Services;

use App\Models\Medicine;
use App\Models\Reservation;
use App\Models\StockLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReservationExpiryService
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function releaseExpired(User $actor): int
    {
        $expiredIds = Reservation::query()
            ->whereIn('status', ['pending', 'ready'])
            ->where('expires_at', '<=', now())
            ->whereDoesntHave('queues', fn ($query) => $query->whereIn('status', ['waiting', 'called']))
            ->pluck('id');

        foreach ($expiredIds as $reservationId) {
            DB::transaction(function () use ($reservationId, $actor) {
                $reservation = Reservation::query()->lockForUpdate()->find($reservationId);
                if (! $reservation || ! in_array($reservation->status, ['pending', 'ready'], true)) {
                    return;
                }

                $medicine = Medicine::query()->lockForUpdate()->find($reservation->medicine_id);
                if ($medicine) {
                    $medicine->reserved_quantity = max(0, $medicine->reserved_quantity - $reservation->quantity);
                    $medicine->save();

                    StockLog::create([
                        'medicine_id' => $medicine->id,
                        'user_id' => $actor->id,
                        'type' => 'expired',
                        'quantity' => $reservation->quantity,
                        'remarks' => 'Reservation expired and stock was released.',
                    ]);
                }

                $reservation->status = 'expired';
                $reservation->save();
                $this->auditLogger->record($actor, 'reservation.expired', 'reservation', $reservation->id, [
                    'medicine_id' => $reservation->medicine_id,
                    'quantity' => $reservation->quantity,
                    'pickup_code' => $reservation->pickup_code,
                    'stock_released' => (bool) $medicine,
                ]);
            });
        }

        return $expiredIds->count();
    }
}
