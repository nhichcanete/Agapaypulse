<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Medicine extends Model
{
    use HasFactory;

    protected $fillable = [
        'medicine_name',
        'generic_name',
        'dosage',
        'category',
        'stock_quantity',
        'reserved_quantity',
        'max_per_release',
        'reorder_level',
        'unit',
        'expiry_date',
        'description',
    ];

    protected $appends = ['available_stock', 'is_expired'];

    protected function casts(): array
    {
        return [
            'stock_quantity' => 'integer',
            'reserved_quantity' => 'integer',
            'max_per_release' => 'integer',
            'reorder_level' => 'integer',
            'expiry_date' => 'date',
        ];
    }

    public function getAvailableStockAttribute(): int
    {
        return $this->is_expired ? 0 : max(0, $this->stock_quantity - $this->reserved_quantity);
    }

    public function getIsExpiredAttribute(): bool
    {
        return $this->expiry_date !== null && $this->expiry_date->isBefore(today());
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    public function stockLogs()
    {
        return $this->hasMany(StockLog::class);
    }
}