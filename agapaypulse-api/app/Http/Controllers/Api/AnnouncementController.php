<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function index()
    {
        return response()->json(Announcement::latest()->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate(['message' => 'required|string|max:1000']);
        $announcement = Announcement::create([
            'message' => $validated['message'],
            'active' => true,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'created',
            'entity' => 'announcement',
            'entity_id' => $announcement->id,
        ]);

        return response()->json($announcement, 201);
    }

    public function destroy(Request $request, Announcement $announcement)
    {
        $announcement->update(['active' => false]);
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'deactivated',
            'entity' => 'announcement',
            'entity_id' => $announcement->id,
        ]);

        return response()->json(['message' => 'Announcement removed from the live board.']);
    }
}