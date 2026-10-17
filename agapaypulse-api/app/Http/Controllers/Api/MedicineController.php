<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use App\Models\StockLog;
use App\Services\AuditLogger;
use App\Services\ReservationExpiryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MedicineController extends Controller
{
    public function __construct(
        private ReservationExpiryService $reservationExpiry,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * List medicines with optional search and low-stock filter.
     */
    public function index(Request $request)
    {
        $this->reservationExpiry->releaseExpired($request->user());
        $search = trim((string) $request->input('search'));
        $lowStock = $request->boolean('low_stock');

        $query = Medicine::query();

        if ($search !== '') {
            $query->where(function ($searchQuery) use ($search) {
                $searchQuery->where('medicine_name', 'like', "%{$search}%")
                    ->orWhere('generic_name', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($lowStock) {
            $query->whereRaw('(stock_quantity - reserved_quantity) <= reorder_level');
        }

        return response()->json($query->latest()->paginate(20));
    }

    /**
     * Store a new medicine.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'medicine_name' => 'required|string|max:255',
            'generic_name' => 'nullable|string|max:255',
            'dosage' => 'nullable|string|max:100',
            'category' => 'required|string|max:100',
            'stock_quantity' => 'required|integer|min:0',
            'max_per_release' => 'required|integer|min:1',
            'reorder_level' => 'required|integer|min:0',
            'unit' => 'required|string|max:50',
            'expiry_date' => 'nullable|date',
            'description' => 'nullable|string|max:2000',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $medicine = Medicine::create($validated + ['reserved_quantity' => 0]);

            if ($medicine->stock_quantity > 0) {
                StockLog::create([
                    'medicine_id' => $medicine->id,
                    'user_id' => $request->user()->id,
                    'type' => 'add',
                    'quantity' => $medicine->stock_quantity,
                    'remarks' => 'Initial stock',
                ]);
            }
            $this->auditLogger->record($request->user(), 'medicine.created', 'medicine', $medicine->id, [
                'stock_quantity' => $medicine->stock_quantity,
                'medicine_name' => $medicine->medicine_name,
            ]);

            return response()->json([
                'message' => 'Medicine added successfully.',
                'medicine' => $medicine,
            ], 201);
        });
    }

    /**
     * Update medicine details or stock.
     */
    public function update(Request $request, Medicine $medicine)
    {
        $validated = $request->validate([
            'medicine_name' => 'required|string|max:255',
            'generic_name' => 'nullable|string|max:255',
            'dosage' => 'nullable|string|max:100',
            'category' => 'required|string|max:100',
            'stock_quantity' => 'required|integer|min:0',
            'max_per_release' => 'required|integer|min:1',
            'reorder_level' => 'required|integer|min:0',
            'unit' => 'required|string|max:50',
            'expiry_date' => 'nullable|date',
            'description' => 'nullable|string|max:2000',
        ]);

        return DB::transaction(function () use ($validated, $medicine, $request) {
            $lockedMedicine = Medicine::query()->lockForUpdate()->findOrFail($medicine->id);
            $oldStock = $lockedMedicine->stock_quantity;
            if ($validated['stock_quantity'] < $lockedMedicine->reserved_quantity) {
                return response()->json(['message' => 'Stock cannot be reduced below the quantity reserved for residents.'], 422);
            }

            $lockedMedicine->update($validated);

            if ($oldStock !== $lockedMedicine->stock_quantity) {
                $diff = $lockedMedicine->stock_quantity - $oldStock;
                StockLog::create([
                    'medicine_id' => $lockedMedicine->id,
                    'user_id' => $request->user()->id,
                    'type' => $diff > 0 ? 'add' : 'deduct',
                    'quantity' => abs($diff),
                    'remarks' => 'Manual stock adjustment',
                ]);
            }
            $this->auditLogger->record($request->user(), 'medicine.updated', 'medicine', $lockedMedicine->id, [
                'medicine_name' => $lockedMedicine->medicine_name,
                'stock_before' => $oldStock,
                'stock_after' => $lockedMedicine->stock_quantity,
                'stock_change' => $lockedMedicine->stock_quantity - $oldStock,
            ]);

            return response()->json([
                'message' => 'Medicine updated successfully.',
                'medicine' => $lockedMedicine,
            ]);
        });
    }

    /**
     * Delete a medicine.
     */
    public function destroy(Medicine $medicine)
    {
        if ($medicine->reservations()->exists()) {
            return response()->json(['message' => 'This medicine has reservation history and cannot be deleted. Set its available stock to zero instead.'], 409);
        }

        $this->auditLogger->record(request()->user(), 'medicine.deleted', 'medicine', $medicine->id, [
            'medicine_name' => $medicine->medicine_name,
            'stock_quantity' => $medicine->stock_quantity,
        ]);
        $medicine->delete();

        return response()->json([
            'message' => 'Medicine deleted successfully.',
        ]);
    }
}
