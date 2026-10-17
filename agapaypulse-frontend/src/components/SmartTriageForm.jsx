import React, { useEffect, useState } from 'react';
import client from '../api/client';
import toast, { Toaster } from 'react-hot-toast';
import EntranceCheckInModal from './EntranceCheckInModal';
import { 
  Activity, 
  Heart, 
  Thermometer, 
  Gauge, 
  Wind, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Ticket 
} from 'lucide-react';

export default function SmartTriageForm({ onTicketGenerated }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [showArrivalModal, setShowArrivalModal] = useState(false);

  useEffect(() => {
    let active = true;
    client.get('/my-queue')
      .then((response) => {
        if (active && response.data?.id) {
          setTicket(response.data);
          setStep(3);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const [vitals, setVitals] = useState({
    chief_complaint: '',
    respiratory_rate: '',
    bp_systolic: '',
    bp_diastolic: '',
    temperature: '',
    heart_rate: '',
    spo2: '',
    consciousness: '',
    supplemental_oxygen: '',
    news2_applicable: false,
  });

  const handleChange = (e) => {
    setVitals({ ...vitals, [e.target.name]: e.target.value });
  };

  const calculateNews2 = () => {
    const requiredFields = ['respiratory_rate', 'bp_systolic', 'temperature', 'heart_rate', 'spo2'];
    if (requiredFields.some((field) => vitals[field] === '') || !vitals.consciousness || !vitals.supplemental_oxygen) {
      return { complete: false, triggers: [] };
    }

    const respiratoryRate = Number(vitals.respiratory_rate);
    const systolic = Number(vitals.bp_systolic);
    const temperature = Number(vitals.temperature);
    const heartRate = Number(vitals.heart_rate);
    const spo2 = Number(vitals.spo2);
    const componentScores = {
      'Respiratory rate': respiratoryRate <= 8 || respiratoryRate >= 25 ? 3 : respiratoryRate <= 11 ? 1 : respiratoryRate <= 20 ? 0 : 2,
      'Oxygen saturation (Scale 1)': spo2 <= 91 ? 3 : spo2 <= 93 ? 2 : spo2 <= 95 ? 1 : 0,
      'Systolic blood pressure': systolic <= 90 ? 3 : systolic <= 100 ? 2 : systolic <= 110 ? 1 : systolic >= 220 ? 3 : 0,
      Pulse: heartRate <= 40 ? 3 : heartRate <= 50 ? 1 : heartRate <= 90 ? 0 : heartRate <= 110 ? 1 : heartRate <= 130 ? 2 : 3,
      Temperature: temperature <= 35 ? 3 : temperature <= 36 ? 1 : temperature <= 38 ? 0 : temperature <= 39 ? 1 : 2,
      Consciousness: vitals.consciousness === 'alert' ? 0 : 3,
      'Supplemental oxygen': vitals.supplemental_oxygen === 'yes' ? 2 : 0,
    };
    const score = Object.values(componentScores).reduce((total, points) => total + points, 0);
    const singleParameterThree = Object.values(componentScores).some((points) => points === 3);
    const news2Band = score >= 7 ? 'High' : score >= 5 ? 'Medium' : 'Low';
    const severeBloodPressure = systolic >= 180 || (vitals.bp_diastolic !== '' && Number(vitals.bp_diastolic) >= 120);
    const queuePriority = vitals.consciousness === 'unresponsive'
      ? 'Emergency'
      : severeBloodPressure ? 'High'
      : news2Band === 'Low' && singleParameterThree ? 'Medium' : news2Band;
    const presentation = {
      Low: { color: 'bg-teal-600 text-white', desc: 'Your readings suggest routine review at the health center.' },
      Medium: { color: 'bg-amber-600 text-white', desc: 'Your readings suggest you may need to be seen sooner.' },
      High: { color: 'bg-red-700 text-white', desc: 'Your readings suggest urgent attention is needed. Contact the health center now.' },
      Emergency: { color: 'bg-red-900 text-white', desc: 'Not responding needs immediate help. Call emergency services or alert health-center staff now.' },
    };

    return {
      complete: true,
      queuePriority,
      score,
      componentScores,
      singleParameterThree,
      triggers: Object.entries(componentScores).filter(([, points]) => points > 0).map(([name, points]) => `${name}: ${points} point${points === 1 ? '' : 's'}`),
      ...presentation[queuePriority],
      desc: severeBloodPressure
        ? 'Your blood pressure is very high. Staff should check and repeat it promptly.'
        : presentation[queuePriority].desc,
      severeBloodPressure,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await client.post('/triage/check-in', {
        ...vitals,
        supplemental_oxygen: vitals.supplemental_oxygen === 'yes',
        news2_applicable: true,
      });

      setTicket(res.data);
      toast.success('Queue ticket generated successfully!');
      if (onTicketGenerated) onTicketGenerated(res.data);
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit check-in.');
    } finally {
      setLoading(false);
    }
  };

  const risk = calculateNews2();
  return (
    <div className="mx-auto w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 md:p-8">
      <Toaster />

      <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between sm:pb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Activity className="h-6 w-6 text-teal-600" />
            <span>Health check-in</span>
          </h2>
            <p className="mt-1 text-sm text-slate-600">Remote pre-registration · arrival verified at the center</p>
        </div>

        <div className="flex items-center space-x-2">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step === s 
                  ? 'bg-teal-600 text-white ring-4 ring-teal-100' 
                  : step > s 
                  ? 'bg-teal-100 text-teal-700' 
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              What brings you in today? *
            </label>
            <textarea
              name="chief_complaint"
              required
              rows={3}
              value={vitals.chief_complaint}
              onChange={handleChange}
              placeholder="Describe your current symptoms (e.g. 2 days fever, persistent cough, dizziness)..."
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm"
            />
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              This check-in helps staff decide who may need to be seen sooner. It does not diagnose an illness. If you are under 16, pregnant, or have severe or quickly worsening symptoms, contact or visit the health center for help.
            </p>
          </div>

          <button
            type="button"
            disabled={!vitals.chief_complaint.trim()}
            onClick={() => setStep(2)}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold rounded-xl transition flex items-center justify-center space-x-2 shadow-sm"
          >
            <span>Continue to your readings</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Wind className="h-4 w-4 text-teal-600" />
                <span>Breaths per minute *</span>
              </label>
              <input
                type="number"
                min="1"
                max="80"
                required
                name="respiratory_rate"
                placeholder="e.g. 16"
                value={vitals.respiratory_rate}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Gauge className="h-4 w-4 text-teal-600" />
                <span>Blood pressure *</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="30"
                  max="300"
                  required
                  name="bp_systolic"
                  placeholder="e.g. 120"
                  value={vitals.bp_systolic}
                  onChange={handleChange}
                  className="p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                />
                <input
                  type="number"
                  min="30"
                  max="200"
                  name="bp_diastolic"
                  placeholder="e.g. 80"
                  value={vitals.bp_diastolic}
                  onChange={handleChange}
                  className="p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Thermometer className="h-4 w-4 text-teal-600" />
                <span>Body temperature (°C)</span>
              </label>
              <input
                type="number"
                min="30"
                max="45"
                step="0.1"
                required
                name="temperature"
                placeholder="e.g. 37.2"
                value={vitals.temperature}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Heart className="h-4 w-4 text-teal-600" />
                <span>Heart Rate (BPM)</span>
              </label>
              <input
                type="number"
                min="20"
                max="250"
                required
                name="heart_rate"
                placeholder="e.g. 75"
                value={vitals.heart_rate}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Wind className="h-4 w-4 text-teal-600" />
                <span>Blood oxygen level (%)</span>
              </label>
              <input
                type="number"
                min="50"
                max="100"
                required
                name="spo2"
                placeholder="e.g. 98"
                value={vitals.spo2}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Are you alert and responding normally? *
              </label>
              <select
                required
                name="consciousness"
                value={vitals.consciousness}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm"
              >
                <option value="">Select observation</option>
                <option value="alert">Alert and responding normally</option>
                <option value="new_confusion">New confusion</option>
                <option value="voice">Only responds when spoken to</option>
                <option value="pain">Only responds to touch</option>
                <option value="unresponsive">Not responding</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Are you using prescribed oxygen right now? *
              </label>
              <select
                required
                name="supplemental_oxygen"
                value={vitals.supplemental_oxygen}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm"
              >
                <option value="">Select yes or no</option>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase block">Suggested visit priority</span>
              <p className="mt-0.5 text-sm text-slate-700">{risk.complete ? risk.desc : 'Complete your readings to see how staff may prioritize your visit.'}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${risk.complete ? risk.color : 'bg-slate-200 text-slate-700'}`}>
              {risk.complete ? `${risk.queuePriority} priority` : 'Not ready'}
            </span>
          </div>
          {risk.complete && risk.singleParameterThree && (
            <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900">
              One of your readings may need prompt attention. A health professional will check it in person.
            </p>
          )}
          {risk.complete && risk.severeBloodPressure && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">
              Your blood pressure reading is very high. Please alert health-center staff so they can repeat it and assess you promptly.
            </p>
          )}
          <p className="text-xs leading-relaxed text-slate-500">
            Staff will confirm your readings in person. If your symptoms are severe or getting worse quickly, seek urgent help instead of waiting for an online ticket.
          </p>
          <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-xs leading-relaxed text-slate-700">
            <input
              type="checkbox"
              required
              checked={vitals.news2_applicable}
              onChange={(event) => setVitals((current) => ({ ...current, news2_applicable: event.target.checked }))}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700"
            />
            <span>I am 16 or older and not pregnant. If not, I will contact or visit the health center instead.</span>
          </label>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="col-span-1 inline-flex min-h-12 items-center justify-center gap-1 rounded-lg bg-slate-100 px-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
            >
              <Ticket className="h-5 w-5" />
              <span>{loading ? 'Issuing Ticket...' : 'Generate Queue Ticket'}</span>
            </button>
          </div>
        </form>
      )}

      {step === 3 && ticket && (
        <div className="text-center space-y-6 py-4">
          <div className="inline-flex items-center justify-center p-3 bg-teal-100 text-teal-700 rounded-full">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-slate-900">Queue Ticket Issued</h3>
            <p className="text-xs text-slate-500 mt-1">
              {ticket.arrival_confirmed
                ? 'You are active in the queue. Keep this page open for updates.'
                : 'Your ticket is reserved. Confirm arrival at the health center to join the active line.'}
            </p>
            {ticket.status === 'waiting' && <p className="mt-2 text-sm font-semibold text-teal-800">Estimated wait: {ticket.estimated_wait_minutes ?? '—'} minutes</p>}
          </div>

          <div className="mx-auto w-full max-w-sm space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-white shadow-md sm:p-6">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest block">Ticket Number</span>
            <div className="my-2 break-all font-mono text-5xl font-extrabold text-teal-400 sm:text-6xl">
              {ticket.queue_number}
            </div>
            <div className="flex justify-between items-center text-xs text-slate-300 border-t border-slate-800 pt-3">
              <span>Status: <strong className="capitalize">{ticket.status?.replace('_', ' ')}</strong></span>
              <span className="font-semibold">Suggested visit priority: {ticket.severity}</span>
            </div>
          </div>

          {['High', 'Emergency'].includes(ticket.severity) && (
            <p role="alert" className="mx-auto max-w-sm rounded-lg border border-red-300 bg-red-50 p-3 text-left text-sm font-medium text-red-900">
              {ticket.severity === 'Emergency'
                ? 'Not responding is an emergency. Call emergency services or alert health-center staff immediately; do not wait for this online check-in.'
                : ticket.bp_systolic >= 180 || ticket.bp_diastolic >= 120
                  ? 'Your blood pressure reading is very high. Alert health-center staff so they can repeat it and assess you promptly.'
                : 'Your readings suggest you may need urgent attention. Contact the health center now; this online check-in is not an emergency service.'}
            </p>
          )}
          {ticket.news2_single_parameter_three && ticket.news2_score < 5 && (
            <p role="alert" className="mx-auto max-w-sm rounded-lg border border-amber-300 bg-amber-50 p-3 text-left text-sm font-medium text-amber-900">
              One of your readings may need prompt attention. Please contact the health center for advice.
            </p>
          )}

          {!ticket.arrival_confirmed && (
            <button
              type="button"
              onClick={() => setShowArrivalModal(true)}
              className="w-full max-w-sm mx-auto py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition"
            >
              Confirm arrival at health center
            </button>
          )}

          <p className="text-xs text-slate-500">This ticket is saved to your account. You can leave this page and return to check its status.</p>
        </div>
      )}

      {showArrivalModal && (
        <EntranceCheckInModal
          onClose={() => setShowArrivalModal(false)}
          onSuccess={(updatedQueue) => setTicket((current) => ({ ...current, ...updatedQueue, status: 'waiting', arrival_confirmed: true }))}
        />
      )}
    </div>
  );
}