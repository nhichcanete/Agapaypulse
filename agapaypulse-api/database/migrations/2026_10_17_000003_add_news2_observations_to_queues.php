<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('queues', function (Blueprint $table) {
            $table->unsignedTinyInteger('respiratory_rate')->nullable();
            $table->string('consciousness')->nullable();
            $table->boolean('supplemental_oxygen')->nullable();
            $table->unsignedTinyInteger('news2_score')->nullable();
            $table->boolean('news2_single_parameter_three')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('queues', function (Blueprint $table) {
            $table->dropColumn([
                'respiratory_rate',
                'consciousness',
                'supplemental_oxygen',
                'news2_score',
                'news2_single_parameter_three',
            ]);
        });
    }
};
