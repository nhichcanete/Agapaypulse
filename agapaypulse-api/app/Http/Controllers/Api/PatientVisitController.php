<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SoapNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientVisitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $patientId = $request->user()->patient_id;
        if (! $patientId) {
            return response()->json(['visits' => []]);
        }

        $visits = SoapNote::query()
            ->where('patient_id', $patientId)
            ->whereNotNull('finalized_at')
            ->whereHas('queue', fn ($query) => $query->where('status', 'completed'))
            ->with([
                'queue:id,queue_number,completed_at',
                'user:id,name',
                'prescriptions' => fn ($query) => $query->orderBy('id'),
            ])
            ->latest('finalized_at')
            ->get()
            ->map(fn (SoapNote $note) => [
                'id' => $note->id,
                'visit_date' => $note->finalized_at,
                'queue_number' => $note->queue->queue_number,
                'provider_name' => $note->user->name,
                'visit_summary' => $note->subjective,
                'assessment' => $note->assessment,
                'plan' => $note->plan,
                'prescriptions' => $note->prescriptions->map(fn ($prescription) => [
                    'id' => $prescription->id,
                    'medication' => $prescription->medication,
                    'dose' => $prescription->dose,
                    'route' => $prescription->route,
                    'frequency' => $prescription->frequency,
                    'duration' => $prescription->duration,
                    'instructions' => $prescription->instructions,
                ]),
            ]);

        return response()->json(['visits' => $visits]);
    }
}
