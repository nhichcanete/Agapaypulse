import React, { useState } from 'react';
import client from '../api/client';
import toast, { Toaster } from 'react-hot-toast';
import { UserPlus, Gauge, Thermometer, X, CheckCircle2, Heart, Wind } from 'lucide-react';

const today = new Date().toISOString().slice(0, 10);

export default function BHWKioskModal({ onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [createdTicket, setCreatedTicket] = useState(null);

    const [formData, setFormData] = useState({
        patient_name: '',
        phone: '',
        birth_date: '',
        is_priority: false,
        priority_type: 'Senior Citizen',
        chief_complaint: '',
        bp_systolic: '',
        bp_diastolic: '',
        temperature: '',
        heart_rate: '',
        spo2: '',
        respiratory_rate: '',
        consciousness: '',
        supplemental_oxygen: '',
        news2_applicable: false,
    });

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await client.post('/queue/walk-in', {
                patient_name: formData.patient_name,
                phone: formData.phone || null,
                birth_date: formData.birth_date || null,
                priority_type: formData.is_priority ? formData.priority_type : null,
                chief_complaint: formData.chief_complaint,
                bp_systolic: formData.bp_systolic,
                bp_diastolic: formData.bp_diastolic || null,
                temperature: formData.temperature,
                heart_rate: formData.heart_rate,
                spo2: formData.spo2,
                respiratory_rate: formData.respiratory_rate,
                consciousness: formData.consciousness,
                supplemental_oxygen: formData.supplemental_oxygen === 'yes',
                news2_applicable: formData.news2_applicable,
            });

            setCreatedTicket(res.data);
            toast.success('Walk-in patient registered & ticket issued!');
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Kiosk registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center sm:p-4">
            <Toaster />
            <div className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)]">
                <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <UserPlus className="h-5 w-5 text-teal-400" />
                        <h3 className="font-bold text-base">BHW Assisted Walk-In Kiosk</h3>
                    </div>
                    <button type="button" aria-label="Close walk-in kiosk" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {!createdTicket ? (
                    <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Resident Full Name *
                            </label>
                            <input
                                type="text"
                                required
                                name="patient_name"
                                value={formData.patient_name}
                                onChange={handleChange}
                                placeholder="e.g., Juanita Dela Cruz"
                                autoComplete="name"
                                className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-base focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Phone (Optional)
                                </label>
                                <input
                                    type="text"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="0917XXXXXXX"
                                    className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-base focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Priority Lane
                                </label>
                                <div className="flex items-center space-x-2 mt-2">
                                    <input
                                        type="checkbox"
                                        id="is_priority"
                                        name="is_priority"
                                        checked={formData.is_priority}
                                        onChange={handleChange}
                                        className="h-4 w-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                                    />
                                    <label htmlFor="is_priority" className="text-xs font-bold text-slate-700">
                                        Senior / PWD / Infant
                                    </label>
                                </div>
                                {formData.is_priority && (
                                    <select name="priority_type" value={formData.priority_type} onChange={handleChange} aria-label="Priority identification type" className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm">
                                        <option value="Senior Citizen">Senior Citizen</option>
                                        <option value="PWD">PWD</option>
                                        <option value="Infant">Infant</option>
                                        <option value="Pregnant">Pregnant</option>
                                    </select>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Date of Birth (Optional)</label>
                            <input type="date" name="birth_date" max={today} value={formData.birth_date} onChange={handleChange} className="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Chief Complaint *
                            </label>
                            <input
                                type="text"
                                required
                                name="chief_complaint"
                                value={formData.chief_complaint}
                                onChange={handleChange}
                                placeholder="Reason for visit (e.g. Hypertension refill, Fever)"
                                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
                                    <Gauge className="h-3.5 w-3.5 text-teal-600" />
                                    <span>BP (Systolic) *</span>
                                </label>
                                <input
                                    type="number"
                                    min="30"
                                    max="300"
                                    required
                                    name="bp_systolic"
                                    value={formData.bp_systolic}
                                    onChange={handleChange}
                                    placeholder="e.g. 130"
                                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">BP (Diastolic)</label>
                                <input type="number" name="bp_diastolic" value={formData.bp_diastolic} onChange={handleChange} placeholder="e.g. 80" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center space-x-1">
                                    <Thermometer className="h-3.5 w-3.5 text-teal-600" />
                                    <span>Temp (°C)</span>
                                </label>
                                <input
                                    type="number"
                                    min="30"
                                    max="45"
                                    step="0.1"
                                    required
                                    name="temperature"
                                    value={formData.temperature}
                                    onChange={handleChange}
                                    placeholder="e.g. 37.5"
                                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                                />
                            </div>

                            <div>
                                <label className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-600"><Heart className="h-3.5 w-3.5 text-teal-700" /> Heart rate</label>
                                <input type="number" name="heart_rate" min="20" max="250" required value={formData.heart_rate} onChange={handleChange} placeholder="BPM" className="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20" />
                            </div>

                            <div>
                                <label className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-600"><Wind className="h-3.5 w-3.5 text-teal-700" /> SpO2</label>
                                <input type="number" name="spo2" min="50" max="100" required value={formData.spo2} onChange={handleChange} placeholder="%" className="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Respiratory rate *</label>
                                <input type="number" name="respiratory_rate" min="1" max="80" required value={formData.respiratory_rate} onChange={handleChange} placeholder="Breaths/min" className="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Consciousness / new confusion *</label>
                                <select name="consciousness" required value={formData.consciousness} onChange={handleChange} className="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm">
                                    <option value="">Select observation</option>
                                    <option value="alert">Alert</option>
                                    <option value="new_confusion">New confusion</option>
                                    <option value="voice">Responds to voice</option>
                                    <option value="pain">Responds to pain</option>
                                    <option value="unresponsive">Unresponsive</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Supplemental oxygen? *</label>
                                <select name="supplemental_oxygen" required value={formData.supplemental_oxygen} onChange={handleChange} className="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm">
                                    <option value="">Select yes or no</option>
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs leading-relaxed text-amber-900">
                                These readings help staff decide who may need to be seen sooner. They do not diagnose an illness. If the person is under 16, pregnant, or has severe or quickly worsening symptoms, arrange an in-person assessment.
                            </p>
                            <label className="flex items-start gap-2 text-xs leading-relaxed text-amber-950">
                                <input type="checkbox" required checked={formData.news2_applicable} onChange={handleChange} name="news2_applicable" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700" />
                                <span>I confirm the person is 16 or older and not pregnant.</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-base font-bold text-white shadow-sm transition hover:bg-teal-800"
                        >
                            <UserPlus className="h-4 w-4" />
                            <span>{loading ? 'Generating Ticket...' : 'Issue Walk-In Ticket'}</span>
                        </button>
                    </form>
                ) : (
                    <div className="p-6 text-center space-y-4">
                        <div className="inline-flex p-3 bg-teal-100 text-teal-700 rounded-full">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-slate-900">Ticket Issued Successfully</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Physical slip ready for patient</p>
                        </div>

                        <div className="bg-slate-900 text-white p-5 rounded-2xl my-3">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Queue Number</span>
                            <span className="text-5xl font-extrabold font-mono text-teal-400 block my-1">
                                {createdTicket.queue_number}
                            </span>
                            <span className="text-xs text-slate-300">{formData.patient_name}</span>
                            <span className="mt-2 block text-xs text-teal-200">Suggested visit priority: {createdTicket.severity}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setCreatedTicket(null);
                                setFormData({
                                    patient_name: '',
                                    phone: '',
                                    birth_date: '',
                                    is_priority: false,
                                    priority_type: 'Senior Citizen',
                                    chief_complaint: '',
                                    bp_systolic: '',
                                    bp_diastolic: '',
                                    temperature: '',
                                    heart_rate: '',
                                    spo2: '',
                                    respiratory_rate: '',
                                    consciousness: '',
                                    supplemental_oxygen: '',
                                    news2_applicable: false,
                                });
                            }}
                            className="min-h-12 w-full rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
                        >
                            Register Another Walk-In Resident
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}