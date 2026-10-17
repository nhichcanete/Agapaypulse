<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DisplayController;
use App\Http\Controllers\Api\MedicineController;
use App\Http\Controllers\Api\PatientVisitController;
use App\Http\Controllers\Api\PriorityVerificationController;
use App\Http\Controllers\Api\QueueController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\ResidentDirectoryController;
use Illuminate\Support\Facades\Route;

// Public Endpoints
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::get('/display', [DisplayController::class, 'index']);

// Protected Authenticated Routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::put('/profile/password', [AuthController::class, 'updatePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/medicines', [MedicineController::class, 'index']);
    Route::middleware('role:resident')->post('/priority-verification', [PriorityVerificationController::class, 'submit']);

    Route::middleware('role:staff,admin,pharmacist')->group(function () {
        Route::get('/resident-directory', [ResidentDirectoryController::class, 'index']);
    });

    // Resident Actions
    Route::middleware('role:resident')->group(function () {
        Route::post('/triage/check-in', [QueueController::class, 'store']);
        Route::get('/my-queue', [QueueController::class, 'myQueue']);
        Route::get('/my-visits', [PatientVisitController::class, 'index']);
        Route::post('/confirm-arrival', [QueueController::class, 'confirmArrival']);
        Route::post('/reservations', [ReservationController::class, 'store']);
        Route::get('/my-reservations', [ReservationController::class, 'myReservations']);
    });

    // Staff, nurses, and pharmacists can operate their assigned queue streams.
    Route::middleware('role:staff,admin,pharmacist')->group(function () {
        Route::get('/queue', [QueueController::class, 'index']);
        Route::post('/queue/call-next', [QueueController::class, 'callNext']);
        Route::post('/queue/skip', [QueueController::class, 'skip']);
    });

    // Staff & Nurse Actions
    Route::middleware('role:staff,admin')->group(function () {
        Route::post('/queue/walk-in', [QueueController::class, 'storeWalkIn']);
        Route::get('/queue/entrance-code', [QueueController::class, 'entranceCode']);
        Route::post('/queue/confirm-arrival', [QueueController::class, 'confirmWalkInArrival']);
        Route::post('/queue/complete', [QueueController::class, 'complete']);
        Route::post('/soap-notes', [AnalyticsController::class, 'storeSoapNote']);
    });

    // Pharmacist Actions
    Route::middleware('role:pharmacist,admin')->group(function () {
        Route::get('/pharmacy/reservations', [ReservationController::class, 'index']);
        Route::post('/pharmacy/lookup-claim', [ReservationController::class, 'lookupClaim'])->middleware('throttle:30,1');
        Route::post('/pharmacy/complete-pickup', [ReservationController::class, 'completePickup']);
        Route::post('/medicines', [MedicineController::class, 'store']);
        Route::put('/medicines/{medicine}', [MedicineController::class, 'update']);
    });

    // Admin Actions
    Route::middleware('role:admin')->group(function () {
        Route::get('/priority-verifications', [PriorityVerificationController::class, 'index']);
        Route::get('/priority-verifications/{patient}/document', [PriorityVerificationController::class, 'document']);
        Route::post('/priority-verifications/{patient}/review', [PriorityVerificationController::class, 'review']);
        Route::delete('/medicines/{medicine}', [MedicineController::class, 'destroy']);
        Route::get('/analytics/overview', [AnalyticsController::class, 'index']);
        Route::get('/analytics/export-philhealth', [AnalyticsController::class, 'exportPhilhealth']);
        Route::get('/analytics/export-fhsis', [AnalyticsController::class, 'exportFhsis']);
        Route::get('/announcements', [AnnouncementController::class, 'index']);
        Route::post('/announcements', [AnnouncementController::class, 'store']);
        Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy']);
        Route::delete('/audit-logs', [AuditLogController::class, 'destroyMatching']);
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
        Route::get('/audit-logs/{auditLog}', [AuditLogController::class, 'show']);
    });
});
