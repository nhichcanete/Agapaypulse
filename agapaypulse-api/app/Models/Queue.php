<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Queue extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'reservation_id',
        'queue_number',
        'stream',
        'sequence_number',
        'desk_number',
        'status',
        'arrival_confirmed',
        'confirmed_at',
        'severity',
        'chief_complaint',
        'respiratory_rate',
        'bp_systolic',
        'bp_diastolic',
        'temperature',
        'heart_rate',
        'spo2',
        'consciousness',
        'supplemental_oxygen',
        'news2_score',
        'news2_single_parameter_three',
        'called_at',
        'completed_at',
        'no_show_at',
    ];

    protected $casts = [
        'called_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'arrival_confirmed' => 'boolean',
        'completed_at' => 'datetime',
        'no_show_at' => 'datetime',
        'bp_systolic' => 'float',
        'bp_diastolic' => 'float',
        'temperature' => 'float',
        'heart_rate' => 'integer',
        'spo2' => 'integer',
        'respiratory_rate' => 'integer',
        'supplemental_oxygen' => 'boolean',
        'news2_score' => 'integer',
        'news2_single_parameter_three' => 'boolean',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function reservation()
    {
        return $this->belongsTo(Reservation::class);
    }
}
