import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BadgeCheck, ChevronLeft, ChevronRight, Clock3, FileImage, ShieldCheck, UserRound, X } from 'lucide-react';
import client from '../../api/client';

const statusLabels = {
  pending: 'Awaiting review',
  approved: 'Verified',
  rejected: 'Needs resubmission',
};

export default function PriorityVerificationPage() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentError, setDocumentError] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['priority-verifications', status, page],
    queryFn: async () => (await client.get('/priority-verifications', { params: { status, page } })).data,
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    if (!selected) return undefined;

    client.get(`/priority-verifications/${selected.id}/document`, { responseType: 'blob' })
      .then((response) => {
        objectUrl = URL.createObjectURL(response.data);
        if (active) setDocumentUrl(objectUrl);
      })
      .catch((error) => {
        if (active) setDocumentError(error.response?.data?.message || 'Could not load the submitted ID image.');
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selected]);

  useEffect(() => {
    if (!selected) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selected]);

  const reviewMutation = useMutation({
    mutationFn: async ({ patientId, decision, note }) => (await client.post(`/priority-verifications/${patientId}/review`, {
      status: decision,
      note: note || undefined,
    })).data,
    onSuccess: async (response) => {
      toast.success(response.message);
      setSelected(null);
      setReviewNote('');
      await queryClient.invalidateQueries({ queryKey: ['priority-verifications'] });
      await queryClient.invalidateQueries({ queryKey: ['resident-directory'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not save the review.'),
  });

  const handleReview = (decision) => {
    if (decision === 'rejected' && !reviewNote.trim()) {
      toast.error('Add a short reason so the resident knows what to correct.');
      return;
    }
    reviewMutation.mutate({ patientId: selected.id, decision, note: reviewNote.trim() });
  };

  const submissions = data?.data || [];

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <header className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#133d3b_0%,#176760_65%,#18877d_100%)] p-5 text-white shadow-xl shadow-teal-950/10 sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-24 -z-10 h-72 w-72 rounded-full border border-white/10" />
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-50"><ShieldCheck className="h-3.5 w-3.5" /> Admin workspace</span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Priority ID review</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-teal-50/80">Review private documents submitted by residents. Approving a document verifies their account priority status; triage urgency is still set separately from visit readings.</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-bold text-slate-950">Resident submissions</h2>
            <p className="mt-1 text-sm text-slate-500">{data?.meta?.total ?? 0} matching submissions</p>
          </div>
          <label className="text-sm font-semibold text-slate-700">
            Filter
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="ml-2 min-h-11 rounded-lg border border-slate-300 bg-white px-3">
              <option value="pending">Awaiting review</option>
              <option value="approved">Verified</option>
              <option value="rejected">Needs resubmission</option>
              <option value="all">All submissions</option>
            </select>
          </label>
        </div>

        {isPending ? (
          <p role="status" className="p-8 text-center text-sm text-slate-500">Loading submissions…</p>
        ) : isError ? (
          <div role="alert" className="flex flex-col gap-3 p-6 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
            <span>Could not load priority ID submissions.</span>
            <button type="button" onClick={() => refetch()} className="min-h-11 rounded-lg border border-rose-300 px-3 font-semibold hover:bg-rose-50">Try again</button>
          </div>
        ) : submissions.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <BadgeCheck className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 font-semibold text-slate-900">No submissions in this view</p>
            <p className="mt-1 text-sm text-slate-600">{status === 'pending' ? 'New resident documents will appear here.' : 'Try another status filter.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {submissions.map((submission) => (
              <li key={submission.id}>
                <button type="button" onClick={() => { setDocumentUrl(''); setDocumentError(''); setSelected(submission); setReviewNote(''); }} className="flex min-h-20 w-full items-center gap-3 p-4 text-left transition hover:bg-teal-50/60 sm:px-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800"><UserRound className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-900">{submission.name}</span>
                    <span className="mt-0.5 block truncate text-sm text-slate-600">{submission.id_type} · {submission.email || 'No email'}</span>
                  </span>
                  <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${submission.status === 'pending' ? 'bg-amber-50 text-amber-900' : submission.status === 'approved' ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>{statusLabels[submission.status] || submission.status}</span>
                  <FileImage className="h-5 w-5 shrink-0 text-slate-400" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {data?.meta?.last_page > 1 && (
          <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-5">
            <span className="text-xs text-slate-500">Page {data.meta.current_page} of {data.meta.last_page}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button>
              <button type="button" disabled={page >= data.meta.last_page} onClick={() => setPage((current) => current + 1)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button>
            </div>
          </footer>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setSelected(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="priority-review-title" onClick={(event) => event.stopPropagation()} className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <h2 id="priority-review-title" className="truncate font-bold text-slate-950">Review {selected.name}</h2>
                <p className="text-sm text-slate-500">{selected.id_type}{selected.id_number ? ` · ${selected.id_number}` : ''}</p>
              </div>
              <button type="button" aria-label="Close review" onClick={() => setSelected(null)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="grid min-h-48 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {documentUrl ? <img src={documentUrl} alt={`${selected.id_type} document submitted by ${selected.name}`} className="max-h-[50dvh] w-full object-contain" /> : documentError ? <p role="alert" className="p-4 text-center text-sm text-rose-800">{documentError}</p> : <p role="status" className="text-sm text-slate-500">Loading private ID image…</p>}
              </div>
              {selected.status === 'pending' ? (
                <>
                  <label className="block text-sm font-semibold text-slate-700">
                    Review note <span className="font-normal text-slate-500">(required if declining)</span>
                    <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={1000} rows={3} className="mt-1.5 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm" placeholder="If the image is unclear or the details do not match, explain what to resubmit." />
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button type="button" disabled={reviewMutation.isPending || !documentUrl} onClick={() => handleReview('approved')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 text-sm font-bold text-white hover:bg-teal-900 disabled:opacity-60"><BadgeCheck className="h-4 w-4" /> Approve ID</button>
                    <button type="button" disabled={reviewMutation.isPending || !documentUrl || !reviewNote.trim()} onClick={() => handleReview('rejected')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 text-sm font-bold text-rose-800 hover:bg-rose-50 disabled:opacity-50"><Clock3 className="h-4 w-4" /> Decline & request new image</button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-semibold">{statusLabels[selected.status]}</p>
                  {selected.review_note && <p className="mt-1">{selected.review_note}</p>}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
