<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->string('priority_document_path')->nullable();
            $table->string('priority_document_status')->default('not_submitted');
            $table->text('priority_review_note')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn([
                'priority_document_path',
                'priority_document_status',
                'priority_review_note',
            ]);
        });
    }
};
