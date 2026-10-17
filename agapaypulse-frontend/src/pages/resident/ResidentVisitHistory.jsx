import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, FileText, LoaderCircle, Pill } from 'lucide-react';
import client from '../../api/client';

function formatVisitDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function ResidentVisitHistory() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['resident-visits'],
    queryFn: async () => (await client.get('/my-visits')).data,
  });
  const visits = data?.visits || [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-2xl bg-[linear-gradient(120deg,#123b39_0%,#145e59_62%,#16847a_100%)] p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-teal-100" />
          <div>
            <h2 className="text-2xl font-extrabold">My Visit History</h2>
            <p className="mt-1 text-sm text-teal-50/85">Finalized visit summaries and separately recorded medication orders.</p>
          </div>
        </div>
      </header>

      <aside className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <p>
          Your visit summary is for your information and does not replace guidance from your care team. Medication entries are not valid prescriptions or authorization to dispense. Contact your health center or prescriber if you need clarification.
        </p>
      </aside>

      {isPending && (
        <div role="status" className="flex items-center justify-center gap-2 rounded-xl bg-white p-10 text-sm font-semibold text-slate-600 shadow-sm">
          <LoaderCircle className="h-5 w-5 animate-spin" /> Loading your visit history…
        </div>
      )}

      {isError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error?.response?.data?.message || 'Your visit history could not be loaded. Please try again.'}
        </div>
      )}

      {!isPending && !isError && visits.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-lg font-bold text-slate-900">No finalized visit summaries yet</h3>
          <p className="mt-1 text-sm text-slate-600">A summary will appear here after staff finalize a visit note and complete the consultation.</p>
        </div>
      )}

      <div className="space-y-4">
        {visits.map((visit) => (
          <article key={visit.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h3 className="font-bold text-slate-950">Visit summary</h3>
                <p className="mt-1 text-xs text-slate-600">Ticket {visit.queue_number} · Recorded by {visit.provider_name}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <CalendarDays className="h-4 w-4" /> {formatVisitDate(visit.visit_date)}
              </span>
            </header>

            <div className="space-y-4 p-4 sm:p-6">
              <section>
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Reason for visit</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{visit.visit_summary}</p>
              </section>

              <section>
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Assessment summary</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{visit.assessment}</p>
              </section>

              <section>
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Care plan</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{visit.plan}</p>
              </section>

              <section className="rounded-xl border border-teal-100 bg-teal-50/70 p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-teal-950">
                  <Pill className="h-4 w-4" /> Medication orders recorded separately
                </h4>
                {visit.prescriptions.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">No separate medication order recorded for this visit.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {visit.prescriptions.map((prescription) => (
                      <li key={prescription.id} className="rounded-lg border border-teal-100 bg-white p-3 text-sm">
                        <p className="font-bold text-slate-900">{prescription.medication} · {prescription.dose}</p>
                        <p className="mt-1 text-slate-700">
                          {prescription.route} · {prescription.frequency} · {prescription.duration}
                        </p>
                        {prescription.instructions && <p className="mt-1 whitespace-pre-wrap text-slate-600">{prescription.instructions}</p>}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs leading-relaxed text-teal-900">
                  This medication record is not a prescription or authorization to dispense.
                </p>
              </section>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
