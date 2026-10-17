import React, { lazy, Suspense, useState } from 'react';
import client from '../api/client';
import toast, { Toaster } from 'react-hot-toast';
import { CheckCircle2, MapPin, X, Camera } from 'lucide-react';

const QrCameraScanner = lazy(() => import('./QrCameraScanner'));

export default function EntranceCheckInModal({ onClose, onSuccess }) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);

    const handleConfirm = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await client.post('/confirm-arrival', { entrance_code: code });
            toast.success('Arrival confirmed! Your ticket is now active in line.');
            if (onSuccess) onSuccess(res.data.queue);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid entrance code. Please check poster at clinic door.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <Toaster />
            <div role="dialog" aria-modal="true" aria-labelledby="arrival-title" className="relative max-h-[calc(100dvh-2rem)] w-full max-w-sm space-y-5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
                <button type="button" aria-label="Close arrival verification" onClick={onClose} className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
                    <X className="h-5 w-5" />
                </button>

                <div className="text-center space-y-2">
                    <div className="p-3 bg-teal-100 text-teal-700 rounded-full inline-block">
                        <MapPin className="h-8 w-8" />
                    </div>
                    <h3 id="arrival-title" className="text-lg font-bold text-slate-900">Confirm your arrival</h3>
                    <p className="text-sm text-slate-600">Scan the entrance poster or enter its daily code.</p>
                </div>

                <form onSubmit={handleConfirm} className="space-y-4">
                    <button type="button" onClick={() => setScannerOpen(true)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        <Camera className="h-4 w-4" /> Scan entrance QR
                    </button>
                    {scannerOpen && <Suspense fallback={<p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">Preparing camera scanner…</p>}><QrCameraScanner onScan={(value) => { setCode(value.trim().toUpperCase()); setScannerOpen(false); toast.success('Entrance code scanned. Confirm to join the active queue.'); }} /></Suspense>}
                    <div>
                        <label htmlFor="entrance-pass-code" className="block text-xs font-bold text-slate-700 uppercase mb-1">Entrance Pass Code</label>
                        <input
                            id="entrance-pass-code"
                            type="text"
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="Enter today's code from the entrance poster"
                            className="min-h-12 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-center font-mono text-sm font-bold uppercase outline-none focus:bg-white focus:ring-2 focus:ring-teal-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{loading ? 'Verifying...' : 'Confirm My Arrival'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
}