<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('soap_notes', function (Blueprint $table) {
            $table->timestamp('finalized_at')->nullable()->after('plan');
        });

        Schema::create('soap_note_prescriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('soap_note_id')->constrained()->cascadeOnDelete();
            $table->string('medication', 255);
            $table->string('dose', 100);
            $table->string('route', 100);
            $table->string('frequency', 150);
            $table->string('duration', 150);
            $table->text('instructions')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('soap_note_prescriptions');

        Schema::table('soap_notes', function (Blueprint $table) {
            $table->dropColumn('finalized_at');
        });
    }
};
