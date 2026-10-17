<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Queue;
use App\Services\QueueService;

class DisplayController extends Controller
{
    public function __construct(private QueueService $queueService) {}

    public function index()
    {
        $nowServing = Queue::query()
            ->select(['id', 'stream', 'queue_number', 'desk_number', 'severity', 'called_at'])
            ->where('status', 'called')
            ->where('arrival_confirmed', true)
            ->orderByDesc('called_at')
            ->get()
            ->groupBy(fn (Queue $queue) => $queue->stream.'-'.$queue->desk_number)
            ->map(fn ($deskQueues) => $deskQueues->first())
            ->values();

        $upcoming = collect(['A', 'B'])
            ->flatMap(fn (string $stream) => $this->queueService->getOrderedQueue($stream))
            ->values()
            ->map(fn (Queue $queue) => [
                'id' => $queue->id,
                'stream' => $queue->stream,
                'queue_number' => $queue->queue_number,
                'severity' => $queue->severity,
            ])
            ->values();

        $announcements = Announcement::where('active', true)
            ->latest()
            ->limit(5)
            ->pluck('message');

        return response()->json([
            'now_serving' => $nowServing,
            'upcoming' => $upcoming,
            'announcements' => $announcements,
        ]);
    }
}
