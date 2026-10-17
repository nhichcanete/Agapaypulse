<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SoapNotePrescription extends Model
{
    protected $fillable = [
        'soap_note_id',
        'medication',
        'dose',
        'route',
        'frequency',
        'duration',
        'instructions',
    ];

    public function soapNote()
    {
        return $this->belongsTo(SoapNote::class);
    }
}
