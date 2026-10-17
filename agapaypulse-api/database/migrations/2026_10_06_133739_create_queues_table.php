<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('queues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->string('queue_number'); // e.g. A-101 or B-101
            $table->enum('stream', ['A', 'B'])->default('A');
            $table->integer('sequence_number')->default(100);
            $table->integer('desk_number')->nullable();
            $table->enum('status', ['waiting', 'called', 'completed', 'cancelled', 'no_show'])->default('waiting');
            $table->enum('severity', ['Low', 'Medium', 'High', 'Emergency'])->default('Low');
            $table->text('chief_complaint')->nullable();
            $table->float('bp_systolic')->nullable();
            $table->float('bp_diastolic')->nullable();
            $table->float('temperature')->nullable();
            $table->integer('heart_rate')->nullable();
            $table->integer('spo2')->nullable();
            $table->timestamp('called_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('no_show_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queues');
    }
};