<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResidentDirectoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => 'nullable|string|max:100',
            'priority' => 'nullable|in:all,priority,regular',
            'age_group' => 'nullable|in:all,under_18,18_59,60_plus,unknown',
            'queue_status' => 'nullable|in:all,none,pre_registered,waiting,called,completed,cancelled,no_show',
            'severity' => 'nullable|in:all,Low,Medium,High,Emergency',
            'page' => 'nullable|integer|min:1',
        ]);

        $today = today();
        $activeQueueQuery = static fn ($query) => $query->whereDate('created_at', $today);

        $query = User::query()
            ->where('role', 'resident')
            ->whereNotNull('patient_id')
            ->whereHas('patient')
            ->with([
                'patient' => fn ($query) => $query->select([
                    'id',
                    'full_name',
                    'birth_date',
                    'id_type',
                    'priority_verified',
                    'priority_document_status',
                    'created_at',
                ]),
                'patient.queues' => fn ($query) => $query
                    ->whereDate('created_at', $today)
                    ->latest()
                    ->limit(1)
                    ->select([
                        'id',
                        'patient_id',
                        'queue_number',
                        'status',
                        'severity',
                        'stream',
                        'created_at',
                    ]),
            ]);

        $search = trim($filters['search'] ?? '');
        if ($search !== '') {
            $query->whereHas('patient', function ($patientQuery) use ($search, $today) {
                $patientQuery->where('full_name', 'like', "%{$search}%")
                    ->orWhereHas('queues', fn ($queueQuery) => $queueQuery
                        ->whereDate('created_at', $today)
                        ->where('queue_number', 'like', "%{$search}%"));
            });
        }

        if (($filters['priority'] ?? 'all') === 'priority') {
            $query->whereHas('patient', function ($patientQuery) use ($today) {
                $patientQuery->where('priority_verified', true)
                    ->orWhereDate('birth_date', '<=', $today->copy()->subYears(60)->toDateString());
            });
        } elseif (($filters['priority'] ?? 'all') === 'regular') {
            $query->whereHas('patient', function ($patientQuery) use ($today) {
                $patientQuery->where('priority_verified', false)
                    ->where(function ($ageQuery) use ($today) {
                        $ageQuery->whereNull('birth_date')
                            ->orWhereDate('birth_date', '>', $today->copy()->subYears(60)->toDateString());
                    });
            });
        }

        $ageGroup = $filters['age_group'] ?? 'all';
        if ($ageGroup !== 'all') {
            $query->whereHas('patient', function ($patientQuery) use ($ageGroup, $today) {
                $under18Date = $today->copy()->subYears(18)->toDateString();
                $seniorDate = $today->copy()->subYears(60)->toDateString();

                match ($ageGroup) {
                    'under_18' => $patientQuery->whereNotNull('birth_date')->whereDate('birth_date', '>', $under18Date),
                    '18_59' => $patientQuery->whereDate('birth_date', '<=', $under18Date)->whereDate('birth_date', '>', $seniorDate),
                    '60_plus' => $patientQuery->whereNotNull('birth_date')->whereDate('birth_date', '<=', $seniorDate),
                    'unknown' => $patientQuery->whereNull('birth_date'),
                };
            });
        }

        $queueStatus = $filters['queue_status'] ?? 'all';
        if ($queueStatus === 'none') {
            $query->whereDoesntHave('patient.queues', $activeQueueQuery);
        } elseif ($queueStatus !== 'all') {
            $query->whereHas('patient.queues', fn ($queueQuery) => $activeQueueQuery($queueQuery)
                ->where('status', $queueStatus));
        }

        $severity = $filters['severity'] ?? 'all';
        if ($severity !== 'all') {
            $query->whereHas('patient.queues', fn ($queueQuery) => $activeQueueQuery($queueQuery)
                ->where('severity', $severity));
        }

        $residents = $query->orderByDesc('users.created_at')
            ->paginate(25)
            ->through(function (User $user) {
                $patient = $user->patient;
                $queue = $patient->queues->first();
                $age = $patient->age;
                $priorityLabel = $age !== null && $age >= 60
                    ? 'Senior Citizen'
                    : ($patient->id_type ?: 'None');

                return [
                    'id' => $user->id,
                    'name' => $patient->full_name,
                    'age' => $age,
                    'priority_label' => $priorityLabel,
                    'priority_verified' => (bool) ($patient->priority_verified || ($age !== null && $age >= 60)),
                    'priority_document_status' => $patient->priority_document_status,
                    'registered_at' => $user->created_at,
                    'queue' => $queue ? [
                        'ticket' => $queue->queue_number,
                        'status' => $queue->status,
                        'severity' => $queue->severity,
                        'stream' => $queue->stream,
                    ] : null,
                ];
            });

        return response()->json([
            'data' => $residents->items(),
            'meta' => [
                'current_page' => $residents->currentPage(),
                'last_page' => $residents->lastPage(),
                'per_page' => $residents->perPage(),
                'total' => $residents->total(),
            ],
        ]);
    }
}
