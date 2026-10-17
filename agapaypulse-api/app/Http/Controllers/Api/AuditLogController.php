<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\Medicine;
use App\Models\Queue;
use App\Models\Reservation;
use App\Models\SoapNote;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'action' => 'nullable|string|max:100',
            'entity' => 'nullable|string|max:100',
            'search' => 'nullable|string|max:120',
        ]);

        $logs = $this->filteredLogs($filters)
            ->with('user:id,name,role')
            ->latest()
            ->paginate(50);

        return response()->json($logs);
    }

    public function destroyMatching(Request $request)
    {
        $filters = $request->validate([
            'action' => 'nullable|string|max:100',
            'entity' => 'nullable|string|max:100',
            'search' => 'nullable|string|max:120',
            'confirmation' => 'required|in:DELETE MATCHING LOGS',
        ]);
        unset($filters['confirmation']);

        if (! array_filter($filters, fn ($value) => filled($value))) {
            return response()->json(['message' => 'Set at least one activity filter before deleting matching logs.'], 422);
        }

        $deletedCount = DB::transaction(function () use ($filters) {
            $query = $this->filteredLogs($filters);
            $count = (clone $query)->count();
            $query->delete();

            return $count;
        });

        return response()->json([
            'message' => "{$deletedCount} matching activity log(s) deleted.",
            'deleted_count' => $deletedCount,
        ]);
    }

    private function filteredLogs(array $filters): Builder
    {
        return AuditLog::query()
            ->with('user:id,name,role')
            ->when($filters['action'] ?? null, fn ($query, $action) => $query->where('action', $action))
            ->when($filters['entity'] ?? null, fn ($query, $entity) => $query->where('entity', $entity))
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where(function ($nested) use ($search) {
                    $nested->where('action', 'like', "%{$search}%")
                        ->orWhere('entity', 'like', "%{$search}%")
                        ->orWhere('entity_id', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($user) => $user->where('name', 'like', "%{$search}%"));
                });
            });
    }

    public function show(AuditLog $auditLog)
    {
        $record = match ($auditLog->entity) {
            'announcement' => Announcement::find($auditLog->entity_id),
            'medicine' => Medicine::with(['stockLogs' => fn ($query) => $query->with('user:id,name,role')->latest()->limit(20)])
                ->find($auditLog->entity_id),
            'queue' => Queue::with([
                'patient:id,full_name',
                'reservation:id,pickup_code,medicine_id,quantity,status',
                'reservation.medicine:id,medicine_name,dosage,unit',
            ])->find($auditLog->entity_id),
            'reservation' => Reservation::with([
                'patient:id,full_name',
                'medicine:id,medicine_name,generic_name,dosage,unit',
                'verifiedBy:id,name,role',
                'queues' => fn ($query) => $query->latest('id')->limit(20),
            ])->find($auditLog->entity_id),
            'soap_note' => SoapNote::with(['patient:id,full_name', 'user:id,name,role'])
                ->find($auditLog->entity_id),
            'user' => User::query()->select('id', 'name', 'email', 'role', 'created_at')->find($auditLog->entity_id),
            default => null,
        };

        return response()->json([
            'log' => $auditLog->load('user:id,name,role'),
            'record' => $record,
        ]);
    }
}
