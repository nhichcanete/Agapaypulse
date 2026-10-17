<?php

namespace Tests\Unit;

use App\Services\TriageService;
use PHPUnit\Framework\TestCase;

class TriageServiceTest extends TestCase
{
    private function normalVitals(array $overrides = []): array
    {
        return array_merge([
            'respiratory_rate' => 16,
            'spo2' => 98,
            'bp_systolic' => 120,
            'bp_diastolic' => 80,
            'heart_rate' => 80,
            'temperature' => 37,
            'consciousness' => 'alert',
            'supplemental_oxygen' => false,
        ], $overrides);
    }

    public function test_normal_observations_produce_zero_and_low_score(): void
    {
        $assessment = (new TriageService)->assess($this->normalVitals());

        $this->assertSame(0, $assessment['score']);
        $this->assertSame('Low', $assessment['suggested_severity']);
        $this->assertFalse($assessment['single_parameter_three']);
    }

    public function test_published_news2_component_bands_are_applied(): void
    {
        $service = new TriageService;

        $cases = [
            [['respiratory_rate' => 8], 'Respiratory rate', 3],
            [['respiratory_rate' => 10], 'Respiratory rate', 1],
            [['respiratory_rate' => 21], 'Respiratory rate', 2],
            [['respiratory_rate' => 25], 'Respiratory rate', 3],
            [['spo2' => 91], 'Oxygen saturation (Scale 1)', 3],
            [['spo2' => 92], 'Oxygen saturation (Scale 1)', 2],
            [['spo2' => 94], 'Oxygen saturation (Scale 1)', 1],
            [['bp_systolic' => 90], 'Systolic blood pressure', 3],
            [['bp_systolic' => 100], 'Systolic blood pressure', 2],
            [['bp_systolic' => 110], 'Systolic blood pressure', 1],
            [['bp_systolic' => 220], 'Systolic blood pressure', 3],
            [['heart_rate' => 40], 'Pulse', 3],
            [['heart_rate' => 45], 'Pulse', 1],
            [['heart_rate' => 100], 'Pulse', 1],
            [['heart_rate' => 120], 'Pulse', 2],
            [['heart_rate' => 131], 'Pulse', 3],
            [['temperature' => 35], 'Temperature', 3],
            [['temperature' => 35.5], 'Temperature', 1],
            [['temperature' => 38.5], 'Temperature', 1],
            [['temperature' => 39.1], 'Temperature', 2],
            [['consciousness' => 'new_confusion'], 'Consciousness', 3],
            [['supplemental_oxygen' => true], 'Supplemental oxygen', 2],
        ];

        foreach ($cases as [$overrides, $component, $expectedScore]) {
            $assessment = $service->assess($this->normalVitals($overrides));
            $this->assertSame($expectedScore, $assessment['component_scores'][$component], $component);
        }
    }

    public function test_single_parameter_score_of_three_prompts_urgent_review_without_changing_low_band(): void
    {
        $assessment = (new TriageService)->assess($this->normalVitals([
            'respiratory_rate' => 8,
        ]));

        $this->assertSame(3, $assessment['score']);
        $this->assertSame('Low', $assessment['news2_band']);
        $this->assertSame('Medium', $assessment['suggested_severity']);
        $this->assertTrue($assessment['single_parameter_three']);
        $this->assertStringContainsString('urgent clinical review', $assessment['recommended_response']);
    }

    public function test_aggregate_score_of_five_is_medium_and_seven_is_high(): void
    {
        $service = new TriageService;
        $medium = $service->assess($this->normalVitals([
            'respiratory_rate' => 25,
            'spo2' => 92,
        ]));
        $high = $service->assess($this->normalVitals([
            'respiratory_rate' => 25,
            'spo2' => 91,
            'temperature' => 39.1,
        ]));

        $this->assertSame(5, $medium['score']);
        $this->assertSame('Medium', $medium['suggested_severity']);
        $this->assertSame(8, $high['score']);
        $this->assertSame('High', $high['suggested_severity']);
    }

    public function test_unresponsive_patient_gets_emergency_queue_priority_even_with_otherwise_normal_readings(): void
    {
        $assessment = (new TriageService)->assess($this->normalVitals([
            'consciousness' => 'unresponsive',
        ]));

        $this->assertSame(3, $assessment['score']);
        $this->assertSame('Low', $assessment['news2_band']);
        $this->assertSame('Emergency', $assessment['suggested_severity']);
        $this->assertStringContainsString('not responding', $assessment['recommended_response']);
    }

    public function test_severe_systolic_or_diastolic_pressure_raises_priority_without_changing_news2_score(): void
    {
        $service = new TriageService;
        $highSystolic = $service->assess($this->normalVitals([
            'bp_systolic' => 180,
        ]));
        $highDiastolic = $service->assess($this->normalVitals([
            'bp_diastolic' => 120,
        ]));

        foreach ([$highSystolic, $highDiastolic] as $assessment) {
            $this->assertSame(0, $assessment['score']);
            $this->assertSame('Low', $assessment['news2_band']);
            $this->assertSame('High', $assessment['suggested_severity']);
            $this->assertTrue($assessment['severe_blood_pressure']);
            $this->assertStringContainsString('repeat measurement', $assessment['recommended_response']);
        }
    }

    public function test_diastolic_pressure_is_recorded_but_not_part_of_news2_score(): void
    {
        $assessment = (new TriageService)->assess($this->normalVitals([
            'bp_diastolic' => 120,
        ]));

        $this->assertSame(0, $assessment['score']);
        $this->assertArrayNotHasKey('Diastolic blood pressure', $assessment['component_scores']);
    }
}
