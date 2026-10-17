<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\SoapNote;
use App\Services\AuditLogger;
use App\Services\QueueService;
use App\Services\TriageService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class QueueController extends Controller
{
    protected $queueService;

    protected $triageService;

    protected $auditLogger;

    public function __construct(QueueService $queueService, TriageService $triageService, AuditLogger $auditLogger)
    {
        $this->queueService = $queueService;
        $this->triageService = $triageService;
        $this->auditLogger = $auditLogger;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'chief_complaint' => 'required|string|max:2000',
            'respiratory_rate' => 'required|integer|between:1,80',
            'bp_systolic' => 'required|numeric|between:30,300',
            'bp_diastolic' => 'nullable|numeric|between:30,200',
            'temperature' => 'required|numeric|between:30,45',
            'heart_rate' => 'required|integer|between:20,250',
            'spo2' => 'required|integer|between:50,100',
            'consciousness' => 'required|in:alert,new_confusion,voice,pain,unresponsive',
            'supplemental_oxygen' => 'required|boolean',
            'news2_applicable' => 'required|accepted',
        ]);

        $patient = $request->user()->patient;
        if (! $patient) {
            return response()->json(['message' => 'No patient profile found for this user.'], 422);
        }

        if ($this->news2IsNotApplicable($patient->birth_date, $patient->id_type)) {
            return response()->json([
                'message' => 'Online check-in is available to adults aged 16 or older who are not pregnant. Please contact or visit the health center for help with other check-ins.',
            ], 422);
        }

        $activeTicket = Queue::where('patient_id', $patient->id)
            ->where(function ($query) {
                $query->where('status', 'called')
                    ->orWhere(function ($todayQuery) {
                        $todayQuery->whereDate('created_at', today())
                            ->whereIn('status', ['pre_registered', 'waiting']);
                    });
            })
            ->exists();

        if ($activeTicket) {
            return response()->json(['message' => 'You already have an active queue ticket today.'], 409);
        }

        $recentNoShows = Queue::where('patient_id', $patient->id)
            ->where('status', 'no_show')
            ->where('no_show_at', '>=', now()->subDays(30))
            ->orderByDesc('no_show_at')
            ->limit(3)
            ->get(['no_show_at']);

        if ($recentNoShows->count() === 3 && $recentNoShows->first()->no_show_at->greaterThanOrEqualTo(now()->subDays(14))) {
            return response()->json([
                'message' => 'Remote check-in is paused for 14 days after three recent no-shows. Walk-in service remains available.',
            ], 429);
        }

        $assessment = $this->triageService->assess($validated);
        $validated['severity'] = $assessment['suggested_severity'];
        $validated['news2_score'] = $assessment['score'];
        $validated['news2_single_parameter_three'] = $assessment['single_parameter_three'];
        $queue = $this->queueService->generateTicket($patient, 'A', $validated, true);
        $this->auditLogger->record($request->user(), 'queue.registered', 'queue', $queue->id, [
            'stream' => $queue->stream,
            'severity' => $queue->severity,
            'news2_score' => $assessment['score'],
        ]);

        return response()->json($queue->load('patient'), 201);
    }

    public function storeWalkIn(Request $request)
    {
        $validated = $request->validate([
            'patient_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'birth_date' => 'nullable|date|before:tomorrow',
            'priority_type' => 'nullable|in:Senior Citizen,PWD,Infant,Pregnant',
            'chief_complaint' => 'required|string|max:2000',
            'respiratory_rate' => 'required|integer|between:1,80',
            'bp_systolic' => 'required|numeric|between:30,300',
            'bp_diastolic' => 'nullable|numeric|between:30,200',
            'temperature' => 'required|numeric|between:30,45',
            'heart_rate' => 'required|integer|between:20,250',
            'spo2' => 'required|integer|between:50,100',
            'consciousness' => 'required|in:alert,new_confusion,voice,pain,unresponsive',
            'supplemental_oxygen' => 'required|boolean',
            'news2_applicable' => 'required|accepted',
        ]);

        if ($this->news2IsNotApplicable($validated['birth_date'] ?? null, $validated['priority_type'] ?? null)) {
            return response()->json([
                'message' => 'Online check-in is available to adults aged 16 or older who are not pregnant. Please contact or visit the health center for help with other check-ins.',
            ], 422);
        }

        $patient = Patient::create([
            'full_name' => $validated['patient_name'],
            'contact_number' => $validated['phone'] ?? null,
            'birth_date' => $validated['birth_date'] ?? null,
            'id_type' => $validated['priority_type'] ?? null,
            'priority_verified' => ! empty($validated['priority_type']),
            'priority_verified_at' => ! empty($validated['priority_type']) ? now() : null,
        ]);

        $assessment = $this->triageService->assess($validated);
        $validated['severity'] = $assessment['suggested_severity'];
        $validated['news2_score'] = $assessment['score'];
        $validated['news2_single_parameter_three'] = $assessment['single_parameter_three'];
        $queue = $this->queueService->generateTicket($patient, 'A', $validated);
        $this->auditLogger->record($request->user(), 'queue.walk_in_registered', 'queue', $queue->id, [
            'stream' => $queue->stream,
            'severity' => $queue->severity,
            'news2_score' => $assessment['score'],
            'priority_verified' => (bool) $patient->priority_verified,
        ]);

        return response()->json($queue->load('patient'), 201);
    }

    public function index(Request $request)
    {
        $queues = Queue::with(['patient', 'reservation.medicine'])
            ->where('arrival_confirmed', true)
            ->where(function ($query) {
                $query->where('status', 'called')
                    ->orWhere(function ($todayQuery) {
                        $todayQuery->whereDate('created_at', today())
                            ->where('status', 'waiting');
                    })
                    ->orWhere(function ($pharmacyQueue) {
                        $pharmacyQueue->where('stream', 'B')
                            ->whereNotNull('reservation_id')
                            ->where('status', 'waiting');
                    });
            })
            ->when($request->user()->role === 'pharmacist', fn ($query) => $query->where('stream', 'B'))
            ->when($request->filled('stream'), fn ($query) => $query->where('stream', $request->input('stream')))
            ->orderByRaw("CASE WHEN severity = 'Emergency' THEN 1 WHEN severity = 'High' THEN 2 WHEN severity = 'Medium' THEN 3 ELSE 4 END")
            ->orderBy('created_at')
            ->get();
        $pendingArrivals = $request->user()->role === 'pharmacist'
            ? collect()
            : Queue::with('patient')
                ->whereDate('created_at', today())
                ->where('status', 'pre_registered')
                ->orderBy('created_at')
                ->get();

        return response()->json([
            'queue' => $queues,
            'total_waiting' => $queues->where('status', 'waiting')->count(),
            'pending_arrivals' => $pendingArrivals,
        ]);
    }

    private function news2IsNotApplicable($birthDate, ?string $priorityType): bool
    {
        return ($birthDate && Carbon::parse($birthDate)->age < 16)
            || in_array($priorityType, ['Infant', 'Pregnant'], true);
    }

    public function callNext(Request $request)
    {
        $validated = $request->validate([
            'stream' => 'required|in:A,B',
            'desk_number' => 'required|integer',
        ]);

        if ($request->user()->role === 'pharmacist' && $validated['stream'] !== 'B') {
            return response()->json(['message' => 'Pharmacists can call tickets from the express pharmacy stream only.'], 403);
        }

        $deskBusy = Queue::where('stream', $validated['stream'])
            ->where('desk_number', $validated['desk_number'])
            ->where('status', 'called')
            ->exists();

        if ($deskBusy) {
            return response()->json(['message' => 'Complete or mark the current patient as no-show before calling another ticket.'], 409);
        }

        $nextQueue = $this->queueService->getOrderedQueue($validated['stream'])->first();

        if (! $nextQueue) {
            return response()->json(['message' => 'No waiting patients in queue.'], 404);
        }

        $nextQueue->update([
            'status' => 'called',
            'desk_number' => $validated['desk_number'],
            'called_at' => now(),
        ]);
        $nextQueue->load(['patient', 'reservation.medicine']);
        $this->auditLogger->record($request->user(), 'queue.called', 'queue', $nextQueue->id, [
            'stream' => $nextQueue->stream,
            'desk_number' => $nextQueue->desk_number,
            'queue_number' => $nextQueue->queue_number,
            'patient_name' => $nextQueue->patient?->full_name,
            'severity' => $nextQueue->severity,
            'reservation_id' => $nextQueue->reservation?->id,
            'pickup_code' => $nextQueue->reservation?->pickup_code,
            'medicine_name' => $nextQueue->reservation?->medicine?->medicine_name,
            'quantity' => $nextQueue->reservation?->quantity,
        ]);

        return response()->json($nextQueue);
    }

    public function complete(Request $request)
    {
        $validated = $request->validate(['queue_id' => 'required|exists:queues,id']);

        $queue = Queue::findOrFail($validated['queue_id']);
        if (! SoapNote::where('queue_id', $queue->id)->whereNotNull('finalized_at')->exists()) {
            return response()->json(['message' => 'Finalize the visit note before completing this consultation.'], 409);
        }

        if ($queue->status !== 'called') {
            return response()->json(['message' => 'Only a called ticket can be completed.'], 409);
        }

        $queue->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);
        $this->auditLogger->record($request->user(), 'queue.completed', 'queue', $queue->id, ['stream' => $queue->stream]);

        return response()->json(['message' => 'Queue ticket completed successfully.']);
    }

    public function skip(Request $request)
    {
        $validated = $request->validate(['queue_id' => 'required|exists:queues,id']);

        $queue = Queue::findOrFail($validated['queue_id']);
        if ($queue->status !== 'called') {
            return response()->json(['message' => 'Only a called ticket can be marked as a no-show.'], 409);
        }
        if ($request->user()->role === 'pharmacist' && $queue->stream !== 'B') {
            return response()->json(['message' => 'Pharmacists can only resolve express pharmacy tickets.'], 403);
        }

        $queue->update([
            'status' => 'no_show',
            'no_show_at' => now(),
        ]);
        $metadata = [
            'stream' => $queue->stream,
            'queue_number' => $queue->queue_number,
            'desk_number' => $queue->desk_number,
        ];
        $this->auditLogger->record($request->user(), 'queue.no_show', 'queue', $queue->id, $metadata);
        if ($queue->reservation_id) {
            $this->auditLogger->record($request->user(), 'reservation.pickup_no_show', 'reservation', $queue->reservation_id, [
                ...$metadata,
                'queue_id' => $queue->id,
            ]);
        }

        return response()->json(['message' => 'Patient marked as no-show.']);
    }

    public function myQueue(Request $request)
    {
        $patient = $request->user()->patient;
        if (! $patient) {
            return response()->noContent();
        }

        $queue = Queue::where('patient_id', $patient->id)
            ->where(function ($query) {
                $query->where('status', 'called')
                    ->orWhere(function ($todayQuery) {
                        $todayQuery->whereDate('created_at', today())
                            ->whereIn('status', ['pre_registered', 'waiting']);
                    });
            })
            ->latest()
            ->first();

        if (! $queue) {
            return response()->noContent();
        }

        if ($queue->status === 'waiting') {
            $position = $this->queueService->getOrderedQueue($queue->stream)
                ->search(fn (Queue $waiting) => $waiting->id === $queue->id);
            $queue->setAttribute('estimated_wait_minutes', $position === false ? 0 : $position * 5);
        }

        return response()->json($queue);
    }

    public function confirmArrival(Request $request)
    {
        $request->validate(['entrance_code' => 'required|string']);

        if (! hash_equals($this->dailyEntranceCode(), strtoupper(trim($request->entrance_code)))) {
            return response()->json(['message' => 'Invalid Entrance QR Code.'], 422);
        }

        $patient = $request->user()->patient;
        $queue = Queue::where('patient_id', $patient->id)
            ->whereDate('created_at', today())
            ->where('status', 'pre_registered')
            ->first();

        if (! $queue) {
            return response()->json(['message' => 'No active pre-registration found for today.'], 404);
        }

        $queue->update([
            'status' => 'waiting',
            'arrival_confirmed' => true,
            'confirmed_at' => now(),
        ]);
        $this->auditLogger->record($request->user(), 'queue.arrival_confirmed', 'queue', $queue->id, [
            'channel' => 'resident_qr',
            'stream' => $queue->stream,
        ]);

        $queue->refresh();
        $position = $this->queueService->getOrderedQueue($queue->stream)
            ->search(fn (Queue $waiting) => $waiting->id === $queue->id);
        $queue->setAttribute('estimated_wait_minutes', $position === false ? 0 : $position * 5);

        return response()->json(['message' => 'Arrival confirmed! You are now active in line.', 'queue' => $queue]);
    }

    public function entranceCode()
    {
        return response()->json([
            'code' => $this->dailyEntranceCode(),
            'valid_until' => today()->endOfDay()->toIso8601String(),
        ]);
    }

    public function confirmWalkInArrival(Request $request)
    {
        $validated = $request->validate(['queue_id' => 'required|exists:queues,id']);
        $queue = Queue::whereKey($validated['queue_id'])
            ->where('status', 'pre_registered')
            ->first();

        if (! $queue) {
            return response()->json(['message' => 'No pending arrival was found for that ticket.'], 404);
        }

        $queue->update([
            'status' => 'waiting',
            'arrival_confirmed' => true,
            'confirmed_at' => now(),
        ]);
        $this->auditLogger->record($request->user(), 'queue.arrival_confirmed', 'queue', $queue->id, [
            'channel' => 'staff_assisted',
            'stream' => $queue->stream,
        ]);

        return response()->json(['message' => 'Arrival confirmed.', 'queue' => $queue->load('patient')]);
    }

    private function dailyEntranceCode(): string
    {
        $signature = strtoupper(substr(hash_hmac('sha256', today()->toDateString(), (string) config('app.key')), 0, 8));

        return 'AGAPAY-BHC-'.today()->format('Ymd').'-'.$signature;
    }
}
