import React, { useState } from 'react';
import client from '../api/client';
import toast, { Toaster } from 'react-hot-toast';
import { usePolling } from '../hooks/usePolling';
import BHWKioskModal from './BHWKioskModal';
import SoapNoteModal from './SoapNoteModal';
import { QRCodeSVG } from 'qrcode.react';
import {
  Activity,
  Users,
  Megaphone,
  UserX,
  Heart,
  Thermometer,
  Gauge,
  Wind,
  Clock,
  UserPlus,
  FileText,
  QrCode,
} from 'lucide-react';

export default function QueueConsole({ initialStream = 'A', pharmacyMode = false }) {
  const [stream, setStream] = useState(initialStream);
  const [deskNumber, setDeskNumber] = useState(1);
  const [currentServing, setCurrentServing] = useState(null);
  const [waitingList, setWaitingList] = useState([]);
  const [pendingArrivals, setPendingArrivals] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showKiosk, setShowKiosk] = useState(false);
  const [showSoap, setShowSoap] = useState(false);
  const [entranceCode, setEntranceCode] = useState(null);

  usePolling(async () => {
    try {
      const res = await client.get('/queue');
      const nowServing = res.data.queue.find(s => s.status === 'called' && s.stream === stream && s.desk_number === deskNumber);
      setCurrentServing(nowServing || null);
      setWaitingList(res.data.queue.filter((item) => item.status === 'waiting' && item.stream === stream));
      setPendingArrivals(res.data.pending_arrivals || []);
    } catch (e) {
      console.error(e);
    }
  }, 4000);

  const handleConfirmArrival = async (queueId) => {
    try {
      await client.post('/queue/confirm-arrival', { queue_id: queueId });
      toast.success('Resident arrival confirmed. Ticket is now in the active line.');
      setPendingArrivals((arrivals) => arrivals.filter((arrival) => arrival.id !== queueId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not confirm arrival.');
    }
  };

  const handleGetEntranceCode = async () => {
    try {
      const res = await client.get('/queue/entrance-code');
      setEntranceCode(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load the entrance QR code.');
    }
  };

  const handleCallNext = async () => {
    setLoading(true);
    try {
      const res = await client.post('/queue/call-next', { stream, desk_number: deskNumber });
      setCurrentServing(res.data);
      toast.success(pharmacyMode ? `Now calling pickup ${res.data.queue_number}` : `Now calling ticket ${res.data.queue_number}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No patients currently waiting.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePickup = async () => {
    if (!currentServing) return;
    setLoading(true);
    try {
      const res = await client.post('/pharmacy/complete-pickup', { queue_id: currentServing.id });
      toast.success(`Pickup ${res.data.pickup_code} released and recorded.`);
      setCurrentServing(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not complete this medicine pickup.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!currentServing) return;
    setLoading(true);
    try {
      await client.post('/queue/skip', { queue_id: currentServing.id });
      toast.error(pharmacyMode ? `Pickup ${currentServing.queue_number} marked as no-show.` : `Ticket ${currentServing.queue_number} marked as No-Show.`);
      setCurrentServing(null);
    } catch {
      toast.error('Failed to update status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Toaster />

      {/* Action Bar */}
      <div className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#123b39_0%,#145e59_62%,#16847a_100%)] p-5 text-white shadow-xl shadow-teal-950/10 sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-24 -z-10 h-64 w-64 rounded-full border border-white/10" />
        <div className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-50"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Live operations</span>
          <h2 className="mt-3 flex items-center gap-2 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            <Users className="h-6 w-6 text-teal-100" />
            <span>{pharmacyMode ? 'Express Pharmacy Pickup' : 'Staff Desk Operations'}</span>
          </h2>
          <p className="mt-1 text-sm text-teal-50/75">{pharmacyMode ? 'Call Stream B pickup tickets, verify the resident and reservation, then confirm medicine release.' : 'Manage triage, arrivals, walk-ins, and patient visits from one desk.'}</p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {!pharmacyMode && <button
            type="button"
            onClick={() => setShowKiosk(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-teal-950 shadow-md transition hover:-translate-y-0.5 hover:bg-teal-50"
          >
            <UserPlus className="h-4 w-4 text-teal-700" />
            <span>BHW Walk-In Kiosk</span>
          </button>}

          {!pharmacyMode && <button type="button" onClick={handleGetEntranceCode} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20">
            <QrCode className="h-4 w-4" /> Entrance QR
          </button>}

          {!pharmacyMode && <select
            value={stream}
            onChange={(e) => setStream(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white outline-none [&>option]:text-slate-900 sm:w-auto"
          >
            <option value="A">Stream A - Consultation</option>
          </select>}

          <select
            value={deskNumber}
            onChange={(e) => setDeskNumber(parseInt(e.target.value))}
            className="min-h-11 w-full rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white outline-none [&>option]:text-slate-900 sm:w-auto"
          >
            {[1, 2, 3, 4].map(d => (
              <option key={d} value={d}>Desk {d}</option>
            ))}
          </select>
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Serving Ticket Card */}
        <div className="lg:col-span-2 space-y-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Currently Serving</span>
            {currentServing && (
              <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-lg text-xs uppercase">
                {pharmacyMode ? 'Pickup in progress' : `${currentServing.severity} Severity`}
              </span>
            )}
          </div>

          {currentServing ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-5 rounded-xl bg-slate-900 p-4 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">{pharmacyMode ? 'Pickup Ticket' : 'Active Ticket Number'}</span>
                  <div className="text-5xl font-mono font-extrabold text-teal-400 my-1">
                    {currentServing.queue_number}
                  </div>
                  <p className="text-sm text-slate-300 font-medium">
                    Patient: <strong>{currentServing.patient?.full_name || 'Resident'}</strong>
                  </p>
                  {pharmacyMode && currentServing.reservation && (
                    <div className="mt-3 space-y-1 text-sm text-teal-100">
                      <p>Medicine: <strong>{currentServing.reservation.medicine?.medicine_name} {currentServing.reservation.medicine?.dosage}</strong></p>
                      <p>Quantity: <strong>{currentServing.reservation.quantity} {currentServing.reservation.medicine?.unit}</strong></p>
                      <p>Pickup code: <strong className="font-mono">{currentServing.reservation.pickup_code}</strong></p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {pharmacyMode ? (
                    <button
                      type="button"
                      onClick={handleCompletePickup}
                      disabled={loading || !currentServing.reservation}
                      className="w-full px-5 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-2 border border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <QrCode className="h-4 w-4" />
                      <span>{loading ? 'Recording release…' : 'Confirm release & complete pickup'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSoap(true)}
                      className="w-full px-5 py-2 bg-teal-800/80 hover:bg-teal-700 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-2 border border-teal-600"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Finalize Visit & Share Summary</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={loading}
                    className="w-full px-5 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-2"
                  >
                    <UserX className="h-4 w-4" />
                    <span>{pharmacyMode ? 'Mark pickup no-show' : 'Mark No-Show'}</span>
                  </button>
                </div>
              </div>

              {!pharmacyMode && <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Triage & Vital Signs Record</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 flex items-center space-x-1">
                      <Activity className="h-3.5 w-3.5 text-teal-600" />
                      <span>NEWS2</span>
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {currentServing.news2_score ?? 'N/A'}{currentServing.news2_single_parameter_three ? ' · urgent single reading' : ''}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 flex items-center space-x-1">
                      <Wind className="h-3.5 w-3.5 text-teal-600" />
                      <span>Respiratory Rate</span>
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-1">{currentServing.respiratory_rate ?? 'N/A'} /min</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 flex items-center space-x-1">
                      <Gauge className="h-3.5 w-3.5 text-teal-600" />
                      <span>BP</span>
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {currentServing.bp_systolic ? `${currentServing.bp_systolic}/${currentServing.bp_diastolic}` : 'N/A'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 flex items-center space-x-1">
                      <Thermometer className="h-3.5 w-3.5 text-teal-600" />
                      <span>Temp</span>
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {currentServing.temperature ? `${currentServing.temperature}°C` : 'N/A'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 flex items-center space-x-1">
                      <Heart className="h-3.5 w-3.5 text-teal-600" />
                      <span>Heart Rate</span>
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {currentServing.heart_rate ? `${currentServing.heart_rate} BPM` : 'N/A'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 flex items-center space-x-1">
                      <Wind className="h-3.5 w-3.5 text-teal-600" />
                      <span>SpO2</span>
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {currentServing.spo2 ? `${currentServing.spo2}%` : 'N/A'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500">Consciousness</span>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {currentServing.consciousness?.replace('_', ' ') || 'N/A'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500">Supplemental Oxygen</span>
                    <p className="text-sm font-bold text-slate-800 mt-1">
                      {currentServing.supplemental_oxygen == null ? 'N/A' : currentServing.supplemental_oxygen ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-600 uppercase block mb-1">Chief Complaint</span>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {currentServing.chief_complaint || 'No complaint details provided.'}
                  </p>
                </div>
              </div>}
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="p-4 bg-slate-100 text-slate-400 rounded-full inline-block">
                <Clock className="h-8 w-8" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-700">Desk Idle</p>
                <p className="text-xs text-slate-500">{pharmacyMode ? 'Call the next resident waiting to collect a medicine reservation.' : 'Click "Call Next Patient" to pull the highest priority ticket'}</p>
              </div>
              <button
                type="button"
                onClick={handleCallNext}
                disabled={loading}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm transition inline-flex items-center space-x-2 shadow-sm"
              >
                <Megaphone className="h-4 w-4" />
                <span>{pharmacyMode ? 'Call Next Pickup' : 'Call Next Patient'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Up Next List */}
        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{pharmacyMode ? 'Up Next · Pharmacy Pickup' : `Up Next in Stream ${stream}`}</h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-bold">
              {waitingList.length} Waiting
            </span>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {waitingList.length > 0 ? (
              waitingList.map((item) => (
                <div key={item.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-base font-extrabold font-mono text-slate-900">{item.queue_number}</span>
                    <p className="text-xs text-slate-500 mt-0.5">{pharmacyMode ? `${item.patient?.full_name || 'Resident'} · ${item.reservation?.medicine?.medicine_name || 'Reserved medicine'}` : item.patient?.full_name || 'Resident'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${item.severity === 'Emergency' ? 'bg-red-500 text-white' :
                      item.severity === 'High' ? 'bg-orange-500 text-white' :
                        item.severity === 'Medium' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                    {item.severity}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                {pharmacyMode ? 'No medicine pickups are currently waiting.' : `No patients currently waiting in Stream ${stream}.`}
              </div>
            )}
          </div>
        </div>
      </div>

      {!pharmacyMode && <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-950">Remote arrivals</h3>
            <p className="mt-1 text-sm text-slate-600">Confirm residents at the entrance before they join the active call line.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{pendingArrivals.length} pending</span>
        </div>
        {pendingArrivals.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No residents waiting for entrance verification.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {pendingArrivals.map((arrival) => (
              <li key={arrival.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{arrival.patient?.full_name || 'Resident'}</p>
                  <p className="text-sm text-slate-600">Ticket {arrival.queue_number} · {arrival.severity} priority</p>
                </div>
                <button type="button" onClick={() => handleConfirmArrival(arrival.id)} className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800">Confirm arrival</button>
              </li>
            ))}
          </ul>
        )}
      </section>}

      {/* Modals */}
      {showKiosk && <BHWKioskModal onClose={() => setShowKiosk(false)} />}
      {showSoap && currentServing && (
        <SoapNoteModal
          queue={currentServing}
          onClose={(saved) => {
            setShowSoap(false);
            if (saved) setCurrentServing(null);
          }}
        />
      )}
      {entranceCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onClick={() => setEntranceCode(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="entrance-qr-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto w-fit rounded-lg border border-slate-200 bg-white p-3"><QRCodeSVG value={entranceCode.code} size={200} level="Q" /></div>
            <h2 id="entrance-qr-title" className="mt-4 text-lg font-bold text-slate-950">Today's entrance QR</h2>
            <p className="mt-1 break-all font-mono text-sm text-teal-800">{entranceCode.code}</p>
            <p className="mt-2 text-xs text-slate-500">Valid until {new Date(entranceCode.valid_until).toLocaleTimeString()}</p>
            <button type="button" onClick={() => setEntranceCode(null)} className="mt-5 min-h-11 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">Close</button>
          </section>
        </div>
      )}
    </div>
  );
}