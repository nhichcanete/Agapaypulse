<?php

namespace Tests\Feature;

use Tests\TestCase;

class CorsConfigurationTest extends TestCase
{
    public function test_api_cors_preflight_allows_configured_frontend_origin(): void
    {
        config(['cors.allowed_origins' => ['https://agapaypulse.example']]);

        $this->withHeaders([
            'Origin' => 'https://agapaypulse.example',
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'authorization,content-type',
        ])->options('/api/medicines')
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'https://agapaypulse.example');
    }
}
