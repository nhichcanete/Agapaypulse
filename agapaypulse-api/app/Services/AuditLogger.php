<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;

class AuditLogger
{
    public function record(User $actor, string $action, string $entity, ?int $entityId = null, array $metadata = []): AuditLog
    {
        return AuditLog::create([
            'user_id' => $actor->id,
            'action' => $action,
            'entity' => $entity,
            'entity_id' => $entityId,
            'metadata' => $metadata ?: null,
        ]);
    }
}