import React, { useState } from 'react';
import client from '../api/client';
import toast, { Toaster } from 'react-hot-toast';
import { FileText, Save, X, Plus, Trash2 } from 'lucide-react';

export default function SoapNoteModal({ queue, onClose }) {
    const [loading, setLoading] = useState(false);
    const [soap, setSoap] = useState({
        subjective: queue?.chief_complaint || '',
        objective: `BP: ${queue?.bp_systolic || 'N/A'}/${queue?.bp_diastolic || 'N/A'}, Temp: ${queue?.temperature || 'N/A'}°C`,
        assessment: '',
        plan: '',
        prescriptions: [],
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await client.post('/soap-notes', {
                queue_id: queue.id,
                ...soap,
            });

            toast.success('Visit note finalized and shared with the resident.');
            onClose(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save clinical note.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-4">
            <Toaster />
            <div role="dialog" aria-modal="true" aria-labelledby="soap-title" className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)]">
                <div className="flex items-center justify-between gap-3 bg-teal-950 p-4 text-white sm:p-5">
                    <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-teal-400" />
                        <h3 id="soap-title" className="font-bold text-base">Finalize Visit Note</h3>
                    </div>
                    <button type="button" aria-label="Close SOAP note" onClick={onClose} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-teal-900 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subjective (Symptoms)</label>
                        <textarea
                            rows={2}
                            required
                            value={soap.subjective}
                            onChange={(e) => setSoap({ ...soap, subjective: e.target.value })}
                            className="min-h-24 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-base text-slate-950 outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Objective (Vitals & Observations)</label>
                        <textarea
                            rows={2}
                            value={soap.objective}
                            onChange={(e) => setSoap({ ...soap, objective: e.target.value })}
                            className="min-h-24 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-base text-slate-950 outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assessment summary *</label>
                        <textarea
                            rows={2}
                            required
                            value={soap.assessment}
                            onChange={(e) => setSoap({ ...soap, assessment: e.target.value })}
                            placeholder="e.g., Acute Upper Respiratory Tract Infection"
                            className="min-h-24 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-base text-slate-950 outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Care plan summary *</label>
                        <textarea
                            rows={2}
                            required
                            value={soap.plan}
                            onChange={(e) => setSoap({ ...soap, plan: e.target.value })}
                            placeholder="Summarize follow-up and non-medication care. Add any medication order below."
                            className="min-h-24 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-base text-slate-950 outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                        />
                    </div>

                    <section className="space-y-3 rounded-xl border border-teal-200 bg-teal-50 p-4">
                        <div>
                            <h4 className="text-sm font-bold text-teal-950">Separate medication orders (optional)</h4>
                            <p className="mt-1 text-xs leading-relaxed text-teal-900">
                                This record is not a prescription or dispensing authorization. Enter only medication orders separately authorized by the responsible prescriber.
                            </p>
                        </div>
                        {soap.prescriptions.map((prescription, index) => (
                            <div key={index} className="space-y-2 rounded-lg border border-teal-200 bg-white p-3">
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {[
                                        ['medication', 'Medication name'],
                                        ['dose', 'Dose'],
                                        ['route', 'Route'],
                                        ['frequency', 'Frequency'],
                                        ['duration', 'Duration'],
                                    ].map(([field, label]) => (
                                        <label key={field} className="text-xs font-semibold text-slate-700">
                                            {label} *
                                            <input
                                                required
                                                maxLength={field === 'medication' ? 255 : field === 'dose' || field === 'route' ? 100 : 150}
                                                value={prescription[field]}
                                                onChange={(event) => setSoap((current) => ({
                                                    ...current,
                                                    prescriptions: current.prescriptions.map((item, itemIndex) => itemIndex === index
                                                        ? { ...item, [field]: event.target.value }
                                                        : item),
                                                }))}
                                                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                                            />
                                        </label>
                                    ))}
                                </div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Additional instructions
                                    <textarea
                                        maxLength={2000}
                                        value={prescription.instructions}
                                        onChange={(event) => setSoap((current) => ({
                                            ...current,
                                            prescriptions: current.prescriptions.map((item, itemIndex) => itemIndex === index
                                                ? { ...item, instructions: event.target.value }
                                                : item),
                                        }))}
                                        className="mt-1 min-h-16 w-full rounded-lg border border-slate-300 p-2 text-sm"
                                    />
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setSoap((current) => ({
                                        ...current,
                                        prescriptions: current.prescriptions.filter((_, itemIndex) => itemIndex !== index),
                                    }))}
                                    className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-rose-700"
                                >
                                    <Trash2 className="h-3.5 w-3.5" /> Remove order
                                </button>
                            </div>
                        ))}
                        {soap.prescriptions.length < 10 && (
                            <button
                                type="button"
                                onClick={() => setSoap((current) => ({
                                    ...current,
                                    prescriptions: [...current.prescriptions, {
                                        medication: '',
                                        dose: '',
                                        route: '',
                                        frequency: '',
                                        duration: '',
                                        instructions: '',
                                    }],
                                }))}
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-teal-300 bg-white px-3 text-xs font-bold text-teal-900"
                            >
                                <Plus className="h-4 w-4" /> Add medication order
                            </button>
                        )}
                    </section>

                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-base font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-60"
                    >
                        <Save className="h-4 w-4" />
                        <span>{loading ? 'Finalizing visit...' : 'Finalize visit & share summary'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
}