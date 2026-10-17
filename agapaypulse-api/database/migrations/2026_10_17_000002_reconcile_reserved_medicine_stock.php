<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('medicines')->orderBy('id')->each(function ($medicine) {
            $reserved = DB::table('reservations')
                ->where('medicine_id', $medicine->id)
                ->whereIn('status', ['pending', 'ready'])
                ->where('expires_at', '>', now())
                ->sum('quantity');

            DB::table('medicines')
                ->where('id', $medicine->id)
                ->update(['reserved_quantity' => $reserved]);
        });
    }

    public function down(): void
    {
        // Reservation totals are data corrections and cannot be reversed safely.
    }
};
