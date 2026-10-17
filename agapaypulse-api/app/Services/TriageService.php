<?php

namespace App\Services;

class TriageService
{
    public function assess(array $vitals): array
    {
        $respiratoryRate = (int) $vitals['respiratory_rate'];
        $spo2 = (int) $vitals['spo2'];
        $systolic = (float) $vitals['bp_systolic'];
        $diastolic = isset($vitals['bp_diastolic']) ? (float) $vitals['bp_diastolic'] : null;
        $heartRate = (int) $vitals['heart_rate'];
        $temperature = (float) $vitals['temperature'];
        $consciousness = $vitals['consciousness'];
        $supplementalOxygen = filter_var($vitals['supplemental_oxygen'], FILTER_VALIDATE_BOOLEAN);

        $componentScores = [
            'Respiratory rate' => $this->scoreRespiratoryRate($respiratoryRate),
            'Oxygen saturation (Scale 1)' => $spo2 <= 91 ? 3 : ($spo2 <= 93 ? 2 : ($spo2 <= 95 ? 1 : 0)),
            'Systolic blood pressure' => $systolic <= 90 ? 3 : ($systolic <= 100 ? 2 : ($systolic <= 110 ? 1 : ($systolic >= 220 ? 3 : 0))),
            'Pulse' => $heartRate <= 40 ? 3 : ($heartRate <= 50 ? 1 : ($heartRate <= 90 ? 0 : ($heartRate <= 110 ? 1 : ($heartRate <= 130 ? 2 : 3)))),
            'Temperature' => $temperature <= 35 ? 3 : ($temperature <= 36 ? 1 : ($temperature <= 38 ? 0 : ($temperature <= 39 ? 1 : 2))),
            'Consciousness' => $consciousness === 'alert' ? 0 : 3,
            'Supplemental oxygen' => $supplementalOxygen ? 2 : 0,
        ];

        $score = array_sum($componentScores);
        $singleParameterThree = count(array_filter(
            $componentScores,
            static fn (int $componentScore): bool => $componentScore === 3
        )) > 0;
        $severeBloodPressure = $systolic >= 180 || ($diastolic !== null && $diastolic >= 120);
        $news2Band = $score >= 7 ? 'High' : ($score >= 5 ? 'Medium' : 'Low');

        if ($consciousness === 'unresponsive') {
            $severity = 'Emergency';
            $response = 'Emergency: the patient is not responding and needs immediate in-person assessment.';
        } elseif ($severeBloodPressure) {
            $severity = 'High';
            $response = 'Very high blood pressure: prompt in-person review and repeat measurement are recommended.';
        } elseif ($score >= 7) {
            $severity = 'High';
            $response = 'High risk: emergency clinical response is indicated in the NEWS2 acute-care escalation model.';
        } elseif ($score >= 5) {
            $severity = 'Medium';
            $response = 'Medium risk: urgent clinical review is indicated in the NEWS2 acute-care escalation model.';
        } else {
            $severity = $singleParameterThree ? 'Medium' : 'Low';
            if ($singleParameterThree) {
                $response = 'Low aggregate score, but a single parameter scored 3: urgent clinical review is indicated.';
            } else {
                $response = 'Low aggregate score: continue clinical assessment and use professional judgement.';
            }
        }

        return [
            'score' => $score,
            'news2_band' => $news2Band,
            'severe_blood_pressure' => $severeBloodPressure,
            'suggested_severity' => $severity,
            'component_scores' => $componentScores,
            'single_parameter_three' => $singleParameterThree,
            'news2_single_parameter_three' => $singleParameterThree,
            'recommended_response' => $response,
            'disclaimer' => 'These readings help staff prioritize in-person assessment. They do not diagnose an illness or replace a clinician’s assessment. People under 16 or pregnant should contact or visit the health center for help.',
        ];
    }

    private function scoreRespiratoryRate(int $respiratoryRate): int
    {
        if ($respiratoryRate <= 8 || $respiratoryRate >= 25) {
            return 3;
        }

        if ($respiratoryRate <= 11) {
            return 1;
        }

        if ($respiratoryRate <= 20) {
            return 0;
        }

        return 2;
    }
}
