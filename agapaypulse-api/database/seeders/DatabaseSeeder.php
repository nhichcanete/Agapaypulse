<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\Queue;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Default Administrative Users
        User::updateOrCreate(
            ['email' => 'admin@agapaypulse.gov.ph'],
            [
                'name' => 'Dr. Maria Santos',
                'password' => Hash::make('hello123'),
                'role' => 'admin',
            ]
        );

        User::updateOrCreate(
            ['email' => 'staff@agapaypulse.gov.ph'],
            [
                'name' => 'Nurse Teresa Reyes',
                'phone' => '09170000002',
                'role' => 'staff',
                'password' => Hash::make('hello123'),
            ]
        );

        User::updateOrCreate(
            ['email' => 'pharmacist@agapaypulse.gov.ph'],
            [
                'name' => 'Pharm. Jose Cruz',
                'phone' => '09170000003',
                'role' => 'pharmacist',
                'password' => Hash::make('hello123'),
            ]
        );

        // 2. Create Sample Resident Patient Accounts
        $patient1 = Patient::updateOrCreate(
            ['id_number' => 'SC-2024-8891'],
            [
                'full_name' => 'Juan Dela Cruz',
                'birth_date' => '1958-04-12', // Senior Citizen
                'id_type' => 'Senior Citizen',
                'priority_verified' => true,
                'priority_verified_at' => now(),
            ]
        );

        User::updateOrCreate(
            ['email' => 'resident@gmail.com'],
            [
                'name' => 'Juan Dela Cruz',
                'phone' => '09171234567',
                'role' => 'resident',
                'patient_id' => $patient1->id,
                'password' => Hash::make('hello123'),
            ]
        );

        $patient2 = Patient::updateOrCreate(
            ['id_number' => 'PWD-2025-0192'],
            [
                'full_name' => 'Ana Clara Mercado',
                'birth_date' => '1995-09-20',
                'id_type' => 'PWD',
                'priority_verified' => true,
                'priority_verified_at' => now(),
            ]
        );

        User::updateOrCreate(
            ['email' => 'ana@gmail.com'],
            [
                'name' => 'Ana Clara Mercado',
                'phone' => '09189876543',
                'role' => 'resident',
                'patient_id' => $patient2->id,
                'password' => Hash::make('hello123'),
            ]
        );

        // 3. Seed Essential Medicines
        Medicine::updateOrCreate(
            ['medicine_name' => 'Paracetamol'],
            [
                'generic_name' => 'Paracetamol',
                'dosage' => '500mg',
                'category' => 'Analgesic / Antipyretic',
                'stock_quantity' => 1500,
                'reserved_quantity' => 0,
                'max_per_release' => 30,
                'unit' => 'tablets',
            ]
        );

        Medicine::updateOrCreate(
            ['medicine_name' => 'Amoxicillin'],
            [
                'generic_name' => 'Amoxicillin Trihydrate',
                'dosage' => '500mg',
                'category' => 'Antibiotic',
                'stock_quantity' => 800,
                'reserved_quantity' => 0,
                'max_per_release' => 21,
                'unit' => 'capsules',
            ]
        );

        $losartan = Medicine::updateOrCreate(
            ['medicine_name' => 'Losartan'],
            [
                'generic_name' => 'Losartan Potassium',
                'dosage' => '50mg',
                'category' => 'Antihypertensive',
                'stock_quantity' => 2000,
                'reserved_quantity' => 60,
                'max_per_release' => 60,
                'unit' => 'tablets',
            ]
        );

        Medicine::updateOrCreate(
            ['medicine_name' => 'Metformin'],
            [
                'generic_name' => 'Metformin Hydrochloride',
                'dosage' => '500mg',
                'category' => 'Antidiabetic',
                'stock_quantity' => 1200,
                'reserved_quantity' => 0,
                'max_per_release' => 60,
                'unit' => 'tablets',
            ]
        );

        // 4. Seed Live Queue Data
        Queue::updateOrCreate(
            ['queue_number' => 'A-101'],
            [
                'patient_id' => $patient1->id,
                'stream' => 'A',
                'sequence_number' => 101,
                'desk_number' => 1,
                'status' => 'called',
                'severity' => 'High',
                'chief_complaint' => 'Fever and dizziness',
                'bp_systolic' => 140,
                'bp_diastolic' => 90,
                'temperature' => 38.6,
                'heart_rate' => 95,
                'spo2' => 97,
                'called_at' => now(),
            ]
        );

        Queue::updateOrCreate(
            ['queue_number' => 'B-101'],
            [
                'patient_id' => $patient2->id,
                'stream' => 'B',
                'sequence_number' => 101,
                'desk_number' => 1,
                'status' => 'called',
                'severity' => 'Low',
                'chief_complaint' => 'Express maintenance medicine claim',
                'called_at' => now(),
            ]
        );

        // 5. Seed Sample Medicine Reservations
        Reservation::updateOrCreate(
            ['pickup_code' => 'AP-8821-X9A'],
            [
                'patient_id' => $patient1->id,
                'medicine_id' => $losartan->id,
                'quantity' => 30,
                'pickup_window' => '2:00 PM - 4:00 PM',
                'expires_at' => now()->addHours(20),
                'status' => 'ready',
            ]
        );

        Medicine::query()->each(function (Medicine $medicine) {
            $reservedQuantity = Reservation::query()
                ->where('medicine_id', $medicine->id)
                ->whereIn('status', ['pending', 'ready'])
                ->where('expires_at', '>', now())
                ->sum('quantity');

            $medicine->update(['reserved_quantity' => $reservedQuantity]);
        });

        // 6. Seed Public Display Announcements
        Announcement::updateOrCreate(
            ['message' => 'Free Senior Citizen Flu Vaccination ongoing at Desk 3 until 4:00 PM.'],
            ['active' => true]
        );

        Announcement::updateOrCreate(
            ['message' => 'Maintenance medicines (Losartan & Metformin) are fully re-stocked.'],
            ['active' => true]
        );
    }
}
