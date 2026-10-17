import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import client from '../../api/client';
import toast, { Toaster } from 'react-hot-toast';
import { QrCode, Search, Camera, X, UserRound, Clock3 } from 'lucide-react';

const QrCameraScanner = lazy(() => import('../../components/QrCameraScanner'));

function pickupCodeFromScan(value) {
  const scanned = value.trim();
  if (/^AP-[A-Z0-9]{8}$/i.test(scanned)) return scanned.toUpperCase();

  try {
    const url = new URL(scanned);
    if (url.origin !== window.location.origin || url.pathname !== '/pharmacy/claims') return null;
    const code = url.searchParams.get('pickup_code')?.trim() || '';
    return /^AP-[A-Z0-9]{8}$/i.test(code) ? code.toUpperCase() : null;
  } catch {
    return null;
  }
}

export default function PharmacyConsole() {
  const [pickupCode, setPickupCode] = useState(() => new URLSearchParams(window.location.search).get('pickup_code') || '');
  const [claimPreview, setClaimPreview] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: reservations = [], isError: reservationsError } = useQuery({
    queryKey: ['pharmacy-reservations'],
    queryFn: async () => (await client.get('/pharmacy/reservations')).data,
    refetchInterval: 10000,
  });

  const { mutate: lookupClaim, isPending: reviewing } = useMutation({
    mutationFn: async (code) => (await client.post('/pharmacy/lookup-claim', { pickup_code: code.trim().toUpperCase() })).data,
    onMutate: () => {
      setClaimPreview(null);
    },
    onSuccess: (data) => {
      setClaimPreview(data);
      setPickupCode(data.reservation.pickup_code);
      void queryClient.invalidateQueries({ queryKey: ['pharmacy-reservations'] });
      toast.success(`Pickup ticket ${data.queue.queue_number} is in the express pharmacy queue.`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not verify this pickup pass.'),
  });
  const reviewClaim = useCallback((code) => {
    if (code.trim()) lookupClaim(code);
  }, [lookupClaim]);

  useEffect(() => {
    const code = searchParams.get('pickup_code');
    if (code) {
      void reviewClaim(code);
    }
  }, [searchParams, reviewClaim]);

  const handleCheckIn = (e) => {
    e.preventDefault();
    setSearchParams({}, { replace: true });
    reviewClaim(pickupCode);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Toaster />

      <section className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#103d3b_0%,#116b64_58%,#159187_100%)] p-5 text-white shadow-xl shadow-teal-950/10 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 -z-10 h-72 w-72 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-10 -z-10 h-52 w-52 rounded-full border border-white/10" />
        <div className="relative">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-50"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Pharmacy operations</span>
              <h1 className="mt-4 flex items-center gap-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20"><QrCode className="h-6 w-6 text-teal-100" /></span>
                Medicine claim verification
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-teal-50/80">Scan a resident pass, confirm the details, and release the reserved medicine. Each completed pickup updates stock and creates a transaction record.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium text-teal-50/75">Awaiting pickup</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">{reservations.length}<span className="ml-2 text-sm font-semibold text-teal-50/70">passes</span></p>
            </div>
          </div>
          <form onSubmit={handleCheckIn} className="mt-7 flex flex-col gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-md sm:flex-row sm:p-2.5">
            <label className="sr-only" htmlFor="pickup-code">Medicine pickup code</label>
            <input
              id="pickup-code"
              type="text"
              required
              value={pickupCode}
              onChange={(event) => {
                setPickupCode(event.target.value);
                setClaimPreview(null);
              }}
              placeholder="Scan QR or enter pickup code"
              autoComplete="off"
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/20 bg-white px-4 font-mono text-sm font-bold uppercase text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:text-slate-400"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setScannerOpen(true)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20 sm:flex-none"><Camera className="h-4 w-4" /> Scan QR</button>
              <button type="submit" disabled={reviewing} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-teal-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-teal-50 disabled:opacity-60 sm:flex-none"><Search className="h-4 w-4" />{reviewing ? 'Checking…' : 'Check in pickup'}</button>
            </div>
          </form>
        </div>
      </section>

      {claimPreview && (
        <section className="ap-page-enter space-y-4 rounded-2xl border border-amber-200 bg-[linear-gradient(145deg,#fffbeb_0%,#fff7df_100%)] p-4 shadow-sm shadow-amber-900/5 sm:p-6">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-amber-950"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 text-sm">✓</span> Pickup checked in</h2>
            <p className="mt-1 text-sm text-amber-900">Confirm the resident and medicine, then call this ticket from the pharmacy pickup queue. Only release the medicine when the resident is called.</p>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-lg bg-white p-3"><UserRound className="h-4 w-4 text-slate-500" /><div><dt className="text-xs text-slate-500">Resident</dt><dd className="font-semibold text-slate-900">{claimPreview.reservation.patient_name}</dd></div></div>
            <div className="flex items-center gap-2 rounded-lg bg-white p-3"><QrCode className="h-4 w-4 text-slate-500" /><div><dt className="text-xs text-slate-500">Medicine</dt><dd className="font-semibold text-slate-900">{claimPreview.reservation.medicine_name} {claimPreview.reservation.dosage}</dd></div></div>
            <div className="rounded-lg bg-white p-3"><dt className="text-xs text-slate-500">Quantity</dt><dd className="font-semibold text-slate-900">{claimPreview.reservation.quantity} {claimPreview.reservation.unit}</dd></div>
            <div className="flex items-center gap-2 rounded-lg bg-white p-3"><Clock3 className="h-4 w-4 text-slate-500" /><div><dt className="text-xs text-slate-500">Pickup pass expires</dt><dd className="font-semibold text-slate-900">{new Date(claimPreview.reservation.expires_at).toLocaleString()}</dd></div></div>
          </dl>
          <p className="rounded-lg bg-white p-3 text-sm font-semibold text-amber-950">Express Pharmacy ticket {claimPreview.queue.queue_number} · {claimPreview.queue.status === 'called' ? 'Already called to the pharmacy window' : 'Waiting to be called'}</p>
          <p className="text-xs text-amber-900">Pass {claimPreview.reservation.pickup_code} is still reserved. Stock is deducted only after staff confirms pickup from the called-ticket screen.</p>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          <div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Live inventory holds</p><h2 className="mt-1 text-lg font-bold text-slate-950">Reservations awaiting pickup</h2><p className="mt-1 text-sm text-slate-500">Held medicines return to available stock after 24 hours.</p></div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-900"><span className="h-1.5 w-1.5 rounded-full bg-teal-500" />{reservations.length} open</span>
        </div>
        {reservationsError && <p role="alert" className="mt-3 text-sm text-rose-700">Could not refresh the reservation list.</p>}
        {reservations.length ? (
          <ul className="divide-y divide-slate-100">
            {reservations.map((reservation) => (
              <li key={reservation.id} className="flex flex-col gap-3 px-4 py-4 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800"><QrCode className="h-5 w-5" /></span>
                  <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{reservation.patient?.full_name} <span className="font-normal text-slate-400">·</span> {reservation.medicine?.medicine_name}</p><p className="mt-1 text-sm text-slate-600">{reservation.quantity} {reservation.medicine?.unit} <span className="mx-1 text-slate-300">·</span> <span className="font-mono text-xs font-semibold tracking-wide text-teal-800">{reservation.pickup_code}</span></p>{reservation.queues?.[0] && <p className="mt-1 text-xs font-semibold text-teal-800">Pickup ticket {reservation.queues[0].queue_number} · {reservation.queues[0].status}</p>}</div>
                </div>
                <p className="shrink-0 pl-[52px] text-xs text-slate-500 sm:pl-0">Expires {new Date(reservation.expires_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        ) : <div className="px-5 py-12 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><QrCode className="h-6 w-6" /></span><p className="mt-3 font-semibold text-slate-800">No active reservations</p><p className="mt-1 text-sm text-slate-500">New medicine pickup passes will appear here.</p></div>}
      </section>

      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={() => setScannerOpen(false)}>
          <section role="dialog" aria-modal="true" aria-label="Scan pickup QR code" onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-slate-950">Scan resident pass</h2><button type="button" onClick={() => setScannerOpen(false)} aria-label="Close scanner" className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <Suspense fallback={<p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">Preparing camera scanner…</p>}><QrCameraScanner onScan={(value) => {
              const code = pickupCodeFromScan(value);
              setScannerOpen(false);
              if (!code) {
                toast.error('This QR code is not a valid AgapayPulse medicine pass.');
                return;
              }
              setPickupCode(code);
              setSearchParams({ pickup_code: code });
            }} /></Suspense>
            <p className="mt-3 text-sm text-slate-600">Center the QR code in the camera frame.</p>
          </section>
        </div>
      )}
    </div>
  );
}