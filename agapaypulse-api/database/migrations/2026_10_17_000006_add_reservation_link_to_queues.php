<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('queues', function (Blueprint $table) {
            $table->foreignId('reservation_id')->nullable()->after('patient_id')->constrained()->nullOnDelete();
            $table->index(['reservation_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('queues', function (Blueprint $table) {
            $table->dropIndex(['reservation_id', 'status']);
            $table->dropConstrainedForeignId('reservation_id');
        });
    }
};
