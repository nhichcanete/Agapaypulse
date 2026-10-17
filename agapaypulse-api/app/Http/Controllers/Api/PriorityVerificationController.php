<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PriorityVerificationController extends Controller
{
    public function submit(Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'id_type' => 'required|in:Senior Citizen,PWD,Indigent',
            'id_number' => 'nullable|string|max:100',
            'document' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $patient = $request->user()->patient;
        if (! $patient) {
            return response()->json(['message' => 'No resident profile is linked to this account.'], 422);
        }

        $path = $request->file('document')->store("priority-documents/{$patient->id}", 'local');
        if (! $path) {
            return response()->json(['message' => 'The image could not be saved. Please try again.'], 500);
        }

        $oldPath = $patient->priority_document_path;
        $patient->update([
            'id_type' => $validated['id_type'],
            'id_number' => $validated['id_number'] ?? null,
            'priority_document_path' => $path,
            'priority_document_status' => 'pending',
            'priority_review_note' => null,
            'priority_verified' => false,
            'priority_verified_at' => null,
        ]);

        if ($oldPath && $oldPath !== $path) {
            Storage::disk('local')->delete($oldPath);
        }

        $auditLogger->record($request->user(), 'priority_verification.submitted', 'patient', $patient->id, [
            'id_type' => $patient->id_type,
        ]);

        return response()->json([
            'message' => 'Your document was sent to the health-center admin for review.',
            'patient' => $patient->fresh(),
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => 'nullable|in:all,pending,approved,rejected',
            'page' => 'nullable|integer|min:1',
        ]);

        $query = Patient::query()
            ->whereNotNull('priority_document_path')
            ->with('user:id,patient_id,name,email')
            ->when(($filters['status'] ?? 'pending') !== 'all', fn ($patients) => $patients->where(
                'priority_document_status',
                $filters['status'] ?? 'pending'
            ))
            ->latest();

        $patients = $query->paginate(20)->through(fn (Patient $patient) => [
            'id' => $patient->id,
            'name' => $patient->full_name,
            'email' => $patient->user?->email,
            'id_type' => $patient->id_type,
            'id_number' => $patient->id_number,
            'status' => $patient->priority_document_status,
            'review_note' => $patient->priority_review_note,
            'submitted_at' => $patient->updated_at,
        ]);

        return response()->json([
            'data' => $patients->items(),
            'meta' => [
                'current_page' => $patients->currentPage(),
                'last_page' => $patients->lastPage(),
                'total' => $patients->total(),
            ],
        ]);
    }

    public function document(Patient $patient): StreamedResponse|JsonResponse
    {
        if (! $patient->priority_document_path || ! Storage::disk('local')->exists($patient->priority_document_path)) {
            return response()->json(['message' => 'The submitted document is no longer available.'], 404);
        }

        return Storage::disk('local')->response(
            $patient->priority_document_path,
            'priority-document',
            ['Cache-Control' => 'private, no-store, max-age=0'],
            'inline'
        );
    }

    public function review(Request $request, Patient $patient, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
            'note' => 'nullable|string|max:1000|required_if:status,rejected',
        ]);

        if (! $patient->priority_document_path || ! Storage::disk('local')->exists($patient->priority_document_path)) {
            return response()->json(['message' => 'A submitted document is required before review.'], 422);
        }

        if ($patient->priority_document_status !== 'pending') {
            return response()->json(['message' => 'Only pending submissions can be reviewed.'], 409);
        }

        DB::transaction(function () use ($patient, $validated, $request, $auditLogger) {
            $approved = $validated['status'] === 'approved';
            $patient->update([
                'priority_document_status' => $validated['status'],
                'priority_review_note' => $validated['note'] ?? null,
                'priority_verified' => $approved,
                'priority_verified_at' => $approved ? now() : null,
            ]);
            $auditLogger->record($request->user(), "priority_verification.{$validated['status']}", 'patient', $patient->id, [
                'id_type' => $patient->id_type,
                'note' => $validated['note'] ?? null,
            ]);
        });

        return response()->json([
            'message' => $validated['status'] === 'approved'
                ? 'Priority status verified.'
                : 'The submission was declined. The resident can upload a new image.',
            'status' => $validated['status'],
        ]);
    }
}
