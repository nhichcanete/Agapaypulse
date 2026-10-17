<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Patient extends Model
{
    use HasFactory;

    protected $fillable = [
        'full_name',
        'contact_number',
        'philhealth_no',
        'sex',
        'birth_date',
        'id_type',
        'id_number',
        'priority_verified',
        'priority_verified_at',
        'priority_document_path',
        'priority_document_status',
        'priority_review_note',
    ];

    protected $hidden = [
        'priority_document_path',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'priority_verified' => 'boolean',
        'priority_verified_at' => 'datetime',
    ];

    protected $appends = ['age', 'is_priority'];

    public function getAgeAttribute(): ?int
    {
        return $this->birth_date ? Carbon::parse($this->birth_date)->age : null;
    }

    public function getIsPriorityAttribute(): bool
    {
        return $this->priority_verified || ($this->age !== null && $this->age >= 60);
    }

    public function user()
    {
        return $this->hasOne(User::class);
    }

    public function queues()
    {
        return $this->hasMany(Queue::class);
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }
}
