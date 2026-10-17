<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\Queue;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;

class QueueService
{
    public function generateTicket(Patient $patient, string $stream, array $triageData, bool $preRegistered = false): Queue
    {
        return DB::transaction(function () use ($patient, $stream, $triageData, $preRegistered) {
            Patient::query()->whereKey($patient->id)->lockForUpdate()->firstOrFail();

            if ($preRegistered && Queue::where('patient_id', $patient->id)
                ->where(function ($query) {
                    $query->where('status', 'called')
                        ->orWhere(function ($todayQuery) {
                            $todayQuery->whereDate('created_at', today())
                                ->whereIn('status', ['pre_registered', 'waiting']);
                        });
                })
                ->exists()) {
                throw new HttpResponseException(response()->json([
                    'message' => 'You already have an active queue ticket today.',
                ], 409));
            }

            $prefix = $stream === 'A' ? 'A-' : 'B-';

            $latest = Queue::where('stream', $stream)
                ->where(function ($query) {
                    $query->whereDate('created_at', today())
                        ->orWhere(function ($activeQueue) {
                            $activeQueue->where('status', 'called')
                                ->orWhere(function ($activePharmacyQueue) {
                                    $activePharmacyQueue->where('stream', 'B')
                                        ->whereNotNull('reservation_id')
                                        ->where('status', 'waiting');
                                });
                        });
                })
                ->lockForUpdate()
                ->max('sequence_number') ?? 100;

            $nextSequence = $latest + 1;
            $queueNumber = $prefix.$nextSequence;

            return Queue::create([
                'patient_id' => $patient->id,
                'queue_number' => $queueNumber,
                'stream' => $stream,
                'sequence_number' => $nextSequence,
                'status' => $preRegistered ? 'pre_registered' : 'waiting',
                'arrival_confirmed' => ! $preRegistered,
                'confirmed_at' => $preRegistered ? null : now(),
                'severity' => $triageData['severity'] ?? 'Low',
                'chief_complaint' => $triageData['chief_complaint'] ?? null,
                'respiratory_rate' => $triageData['respiratory_rate'] ?? null,
                'bp_systolic' => $triageData['bp_systolic'] ?? null,
                'bp_diastolic' => $triageData['bp_diastolic'] ?? null,
                'temperature' => $triageData['temperature'] ?? null,
                'heart_rate' => $triageData['heart_rate'] ?? null,
                'spo2' => $triageData['spo2'] ?? null,
                'consciousness' => $triageData['consciousness'] ?? null,
                'supplemental_oxygen' => $triageData['supplemental_oxygen'] ?? false,
                'news2_score' => $triageData['news2_score'] ?? null,
                'news2_single_parameter_three' => $triageData['news2_single_parameter_three'] ?? false,
            ]);
        });
    }

    public function getOrderedQueue(string $stream)
    {
        return Queue::query()
            ->join('patients', 'patients.id', '=', 'queues.patient_id')
            ->select('queues.*')
            ->with('patient')
            ->where('queues.stream', $stream)
            ->where('queues.status', 'waiting')
            ->where('queues.arrival_confirmed', true)
            ->where(function ($query) {
                $query->whereDate('queues.created_at', today())
                    ->orWhere(function ($activePharmacyQueue) {
                        $activePharmacyQueue->where('queues.stream', 'B')
                            ->whereNotNull('queues.reservation_id');
                    });
            })
            ->orderByRaw("
                CASE 
                    WHEN severity = 'Emergency' THEN 1
                    WHEN severity = 'High' THEN 2
                    WHEN severity = 'Medium' THEN 3
                    ELSE 4
                END ASC
            ")
            ->orderByRaw('CASE WHEN patients.priority_verified = 1 OR patients.birth_date <= ? THEN 0 ELSE 1 END', [today()->subYears(60)->toDateString()])
            ->orderBy('queues.created_at', 'asc')
            ->get();
    }
}
