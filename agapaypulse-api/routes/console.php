<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Services\ReservationExpiryService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(fn () => app(ReservationExpiryService::class)->releaseExpired())
    ->everyFifteenMinutes()
    ->name('release-expired-medicine-reservations')
    ->withoutOverlapping();
