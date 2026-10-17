<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('queues', function (Blueprint $table) {
            $table->string('status')->default('waiting')->change();
            $table->boolean('arrival_confirmed')->default(true);
            $table->timestamp('confirmed_at')->nullable();
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->string('contact_number', 20)->nullable();
            $table->enum('sex', ['Male', 'Female', 'Other'])->nullable();
            $table->string('philhealth_no')->nullable()->unique();
        });

        Schema::table('medicines', function (Blueprint $table) {
            $table->integer('reorder_level')->default(10);
            $table->date('expiry_date')->nullable();
            $table->text('description')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropUnique(['philhealth_no']);
            $table->dropColumn(['contact_number', 'sex', 'philhealth_no']);
        });

        Schema::table('medicines', function (Blueprint $table) {
            $table->dropColumn(['reorder_level', 'expiry_date', 'description']);
        });

        Schema::table('queues', function (Blueprint $table) {
            $table->dropColumn(['arrival_confirmed', 'confirmed_at']);
            $table->enum('status', ['waiting', 'called', 'completed', 'cancelled', 'no_show'])
                ->default('waiting')->change();
        });
    }
};