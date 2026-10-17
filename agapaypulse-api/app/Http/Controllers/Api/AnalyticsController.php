<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use App\Models\Queue;
use App\Models\Reservation;
use App\Models\SoapNote;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AnalyticsController extends Controller
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function index()
    {
        $today = today();

        $totalPatientsToday = Queue::whereDate('created_at', $today)->count();
        $completedToday = Queue::whereDate('created_at', $today)->where('status', 'completed')->count();
        $totalClaimsToday = Reservation::whereDate('created_at', $today)->where('status', 'claimed')->count();
        $lowStockCount = Medicine::whereRaw('(stock_quantity - reserved_quantity) <= reorder_level')->count();
        $priorityCount = Queue::whereDate('created_at', $today)
            ->whereHas('patient', fn ($query) => $query->where('priority_verified', true)
                ->orWhereDate('birth_date', '<=', today()->subYears(60)))
            ->count();

        // Disease Surveillance Keyword Aggregation
        $complaints = Queue::whereDate('created_at', '>=', now()->subDays(30))
            ->whereNotNull('chief_complaint')
            ->pluck('chief_complaint');

        $surveillance = [
            'URTI / Cough / Cold' => 0,
            'Hypertension / BP' => 0,
            'Fever / Flu' => 0,
            'Dengue / Rash' => 0,
            'Diabetes / Glucose' => 0,
        ];

        foreach ($complaints as $text) {
            $lower = strtolower((string) $text);
            if (str_contains($lower, 'cough') || str_contains($lower, 'cold') || str_contains($lower, 'urti')) {
                $surveillance['URTI / Cough / Cold']++;
            }
            if (str_contains($lower, 'hypertension') || str_contains($lower, 'bp') || str_contains($lower, 'dizziness')) {
                $surveillance['Hypertension / BP']++;
            }
            if (str_contains($lower, 'fever') || str_contains($lower, 'flu')) {
                $surveillance['Fever / Flu']++;
            }
            if (str_contains($lower, 'dengue') || str_contains($lower, 'rash')) {
                $surveillance['Dengue / Rash']++;
            }
            if (str_contains($lower, 'diabetes') || str_contains($lower, 'sugar')) {
                $surveillance['Diabetes / Glucose']++;
            }
        }

        return response()->json([
            'metrics' => [
                'total_today' => $totalPatientsToday,
                'completed_today' => $completedToday,
                'claims_today' => $totalClaimsToday,
                'low_stock' => $lowStockCount,
                'priority_pct' => $totalPatientsToday > 0 ? round(($priorityCount / $totalPatientsToday) * 100) : 0,
            ],
            'surveillance' => $surveillance,
        ]);
    }

    public function exportPhilhealth(): StreamedResponse
    {
        $headers = [
            'Content-type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename=PhilHealth_Konsulta_Export_'.date('Y-m-d').'.csv',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Queue ID', 'Patient Name', 'PhilHealth ID', 'Severity', 'Chief Complaint', 'Consultation Date', 'Status']);

            $queues = Queue::with('patient')->whereDate('created_at', '>=', now()->subDays(30))->get();
            foreach ($queues as $q) {
                fputcsv($file, [
                    $q->queue_number,
                    $q->patient?->full_name ?? 'N/A',
                    $q->patient?->philhealth_no ?? 'UNREGISTERED',
                    $q->severity,
                    $q->chief_complaint,
                    $q->created_at->toDateTimeString(),
                    $q->status,
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function exportFhsis(): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename=AgapayPulse_FHSIS_Visits_'.today()->toDateString().'.csv',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ];

        return response()->stream(function () {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Visit Date', 'Patient Name', 'PhilHealth Number', 'Age', 'Sex', 'Chief Complaint', 'Triage Severity', 'Disposition']);

            Queue::with('patient')
                ->whereDate('created_at', '>=', now()->subDays(30)->toDateString())
                ->orderBy('created_at')
                ->chunk(500, function ($queues) use ($file) {
                    foreach ($queues as $queue) {
                        fputcsv($file, [
                            $queue->created_at?->toDateString(),
                            $queue->patient?->full_name ?? 'Unknown',
                            $queue->patient?->philhealth_no ?? 'UNREGISTERED',
                            $queue->patient?->age ?? '',
                            $queue->patient?->sex ?? '',
                            $queue->chief_complaint,
                            $queue->severity,
                            $queue->status,
                        ]);
                    }
                });

            fclose($file);
        }, 200, $headers);
    }

    public function storeSoapNote(Request $request)
    {
        $validated = $request->validate([
            'queue_id' => 'required|exists:queues,id',
            'subjective' => 'required|string',
            'objective' => 'nullable|string|max:10000',
            'assessment' => 'required|string|max:10000',
            'plan' => 'required|string|max:10000',
            'prescriptions' => 'sometimes|array|max:10',
            'prescriptions.*.medication' => 'required|string|max:255',
            'prescriptions.*.dose' => 'required|string|max:100',
            'prescriptions.*.route' => 'required|string|max:100',
            'prescriptions.*.frequency' => 'required|string|max:150',
            'prescriptions.*.duration' => 'required|string|max:150',
            'prescriptions.*.instructions' => 'nullable|string|max:2000',
        ]);

        $queue = Queue::findOrFail($validated['queue_id']);
        if ($queue->status !== 'called') {
            return response()->json(['message' => 'A visit note can only be finalized for the patient currently being seen.'], 409);
        }

        if (SoapNote::where('queue_id', $queue->id)->exists()) {
            return response()->json(['message' => 'A finalized visit note already exists for this consultation.'], 409);
        }

        $note = DB::transaction(function () use ($validated, $queue, $request) {
            $note = SoapNote::create([
                'queue_id' => $queue->id,
                'patient_id' => $queue->patient_id,
                'user_id' => $request->user()->id,
                'subjective' => $validated['subjective'],
                'objective' => $validated['objective'] ?? null,
                'assessment' => $validated['assessment'],
                'plan' => $validated['plan'],
                'finalized_at' => now(),
            ]);

            $note->prescriptions()->createMany($validated['prescriptions'] ?? []);
            $queue->update(['status' => 'completed', 'completed_at' => now()]);
            $this->auditLogger->record($request->user(), 'soap_note.finalized', 'soap_note', $note->id, [
                'queue_id' => $queue->id,
                'prescription_count' => count($validated['prescriptions'] ?? []),
            ]);
            $this->auditLogger->record($request->user(), 'queue.completed', 'queue', $queue->id, [
                'stream' => $queue->stream,
                'with_finalized_note' => true,
            ]);

            return $note;
        });

        return response()->json($note->load('prescriptions'), 201);
    }
}
