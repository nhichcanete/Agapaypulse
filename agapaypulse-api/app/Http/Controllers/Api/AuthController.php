<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);

        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'phone' => 'required|string|max:20|unique:users,phone',
            'password' => 'required|string|min:8|confirmed',
            'birth_date' => 'required|date|before:today',
            'sex' => 'required|in:Male,Female,Other',
            'philhealth_no' => 'nullable|string|max:50|unique:patients,philhealth_no',
        ]);

        return DB::transaction(function () use ($validated) {
            $patient = Patient::create([
                'full_name' => $validated['full_name'],
                'contact_number' => $validated['phone'],
                'birth_date' => $validated['birth_date'],
                'sex' => $validated['sex'],
                'philhealth_no' => $validated['philhealth_no'] ?? null,
                'priority_verified' => false,
            ]);

            $user = User::create([
                'name' => $validated['full_name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'role' => 'resident',
                'patient_id' => $patient->id,
                'password' => Hash::make($validated['password']),
            ]);

            return response()->json([
                'token' => $user->createToken('auth_token')->plainTextToken,
                'user' => $user->load('patient'),
            ], 201);
        });
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // Trim whitespace and lowercase the incoming email
        $email = strtolower(trim($request->email));

        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid login credentials. Please verify your email and password.',
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load('patient'));
    }

    public function updateProfile(Request $request, AuditLogger $auditLogger)
    {
        $user = $request->user();
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:20', Rule::unique('users', 'phone')->ignore($user->id)],
            'birth_date' => 'nullable|date|before:today',
            'sex' => 'nullable|in:Male,Female,Other',
            'philhealth_no' => ['nullable', 'string', 'max:50', Rule::unique('patients', 'philhealth_no')->ignore($user->patient_id)],
        ]);

        return DB::transaction(function () use ($user, $validated, $auditLogger) {
            $user->update([
                'name' => $validated['name'],
                'email' => strtolower(trim($validated['email'])),
                'phone' => $validated['phone'] ?? null,
            ]);

            if ($user->patient) {
                $user->patient->update([
                    'full_name' => $validated['name'],
                    'contact_number' => $validated['phone'] ?? null,
                    'birth_date' => $validated['birth_date'] ?? null,
                    'sex' => $validated['sex'] ?? null,
                    'philhealth_no' => $validated['philhealth_no'] ?? null,
                ]);
            }

            $auditLogger->record($user, 'profile.updated', 'user', $user->id, [
                'fields' => array_values(array_intersect(
                    ['name', 'email', 'phone', 'birth_date', 'sex', 'philhealth_no'],
                    array_keys($validated)
                )),
            ]);

            return response()->json([
                'message' => 'Profile updated successfully.',
                'user' => $user->fresh()->load('patient'),
            ]);
        });
    }

    public function updatePassword(Request $request, AuditLogger $auditLogger)
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);
        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'The current password is incorrect.'], 422);
        }

        $user->update(['password' => $validated['password']]);
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->getKey())->delete();
        $auditLogger->record($user, 'profile.password_changed', 'user', $user->id);

        return response()->json(['message' => 'Password updated. Other signed-in sessions have been signed out.']);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }
}
