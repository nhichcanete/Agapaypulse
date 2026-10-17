<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class PatientController extends Controller
{
    /**
     * Display a listing of patients with optional search and filter.
     */
    public function index(Request $request)
    {
        $search = trim((string) $request->input('search'));
        $priorityTag = trim((string) $request->input('priority_tag'));

        $query = Patient::query();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('patient_number', 'like', "%{$search}%")
                  ->orWhere('full_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('contact_number', 'like', "%{$search}%");
            });
        }

        if ($priorityTag !== '') {
            $query->where('priority_tag', $priorityTag);
        }

        $patients = $query->latest()->paginate(15);

        return response()->json($patients);
    }

    /**
     * Store a newly created patient.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_number' => 'required|string|max:50|unique:patients,patient_number',
            'full_name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255|unique:patients,email',
            'contact_number' => 'nullable|string|max:20',
            'birth_date' => 'required|date',
            'age' => 'required|integer|min:0|max:150',
            'gender' => 'required|in:Male,Female,Other',
            'address' => 'nullable|string|max:500',
            'profile_picture' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'priority_tag' => 'required|in:Regular,Senior Citizen,PWD,Pregnant,Infant',
        ]);

        if ($request->hasFile('profile_picture')) {
            $validated['profile_picture'] = $request->file('profile_picture')
                ->store('patient_pictures', 'public');
        }

        $patient = Patient::create($validated);

        return response()->json([
            'message' => 'Patient registered successfully.',
            'patient' => $patient,
        ], 201);
    }

    /**
     * Display the specified patient.
     */
    public function show(Patient $patient)
    {
        return response()->json($patient->load(['queues', 'reservations']));
    }

    /**
     * Update the specified patient.
     */
    public function update(Request $request, Patient $patient)
    {
        $validated = $request->validate([
            'patient_number' => [
                'required', 'string', 'max:50',
                Rule::unique('patients', 'patient_number')->ignore($patient->id),
            ],
            'full_name' => 'required|string|max:255',
            'email' => [
                'nullable', 'email', 'max:255',
                Rule::unique('patients', 'email')->ignore($patient->id),
            ],
            'contact_number' => 'nullable|string|max:20',
            'birth_date' => 'required|date',
            'age' => 'required|integer|min:0|max:150',
            'gender' => 'required|in:Male,Female,Other',
            'address' => 'nullable|string|max:500',
            'profile_picture' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'priority_tag' => 'required|in:Regular,Senior Citizen,PWD,Pregnant,Infant',
        ]);

        if ($request->hasFile('profile_picture')) {
            if ($patient->profile_picture && Storage::disk('public')->exists($patient->profile_picture)) {
                Storage::disk('public')->delete($patient->profile_picture);
            }
            $validated['profile_picture'] = $request->file('profile_picture')
                ->store('patient_pictures', 'public');
        }

        $patient->update($validated);

        return response()->json([
            'message' => 'Patient updated successfully.',
            'patient' => $patient,
        ]);
    }

    /**
     * Remove the specified patient.
     */
    public function destroy(Patient $patient)
    {
        if ($patient->profile_picture && Storage::disk('public')->exists($patient->profile_picture)) {
            Storage::disk('public')->delete($patient->profile_picture);
        }

        $patient->delete();

        return response()->json([
            'message' => 'Patient deleted successfully.',
        ]);
    }
}