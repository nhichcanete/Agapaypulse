import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ChevronLeft, ChevronRight, Search, X, ArrowUpRight, UserRound, Clock3, Trash2 } from 'lucide-react';
import client from '../../api/client';

const actions = [
  'queue.registered',
  'queue.walk_in_registered',
  'queue.called',
  'queue.arrival_confirmed',
  'queue.completed',
  'soap_note.finalized',
  'queue.no_show',
  'reservation.created',
  'reservation.qr_scanned',
  'reservation.pickup_queued',
  'reservation.pickup_no_show',
  'reservation.claimed',
  'reservation.expired',
  'medicine.created',
  'medicine.updated',
  'medicine.deleted',
  'announcement.created',
  'profile.updated',
  'profile.password_changed',
  'priority_verification.submitted',
  'priority_verification.approved',
  'priority_verification.rejected',
];

const entities = ['queue', 'reservation', 'medicine', 'soap_note', 'announcement', 'user', 'patient'];

const actionLabels = {
  'queue.called': 'Ticket called',
  'queue.completed': 'Queue ticket completed',
  'queue.no_show': 'Ticket marked no-show',
  'reservation.created': 'Medicine reserved',
  'reservation.qr_scanned': 'Pickup pass scanned',
  'reservation.pickup_queued': 'Added to express pharmacy queue',
  'reservation.pickup_no_show': 'Pickup marked no-show',
  'reservation.claimed': 'Medicine released to resident',
  'reservation.expired': 'Reservation expired and stock released',
};

function formatAction(action) {
  return actionLabels[action] || action.replaceAll('.', ' · ').replaceAll('_', ' ');
}

function formatTimestamp(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(Date.parse(value));
}

function RecordFields({ value }) {
  if (value === null || value === undefined) return <span className="text-slate-400">Not set</span>;
  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-slate-400">None</span>;
    return <div className="mt-2 space-y-2">{value.map((item, index) => <div key={item.id ?? index} className="rounded-lg border border-slate-200 bg-white p-3"><RecordFields value={item} /></div>)}</div>;
  }
  if (typeof value === 'object') {
    return (
      <dl className="grid gap-2 sm:grid-cols-2">
        {Object.entries(value).map(([key, nestedValue]) => (
          <div key={key} className="min-w-0 rounded-lg bg-slate-50 p-3">
            <dt className="text-xs capitalize text-slate-500">{key.replaceAll('_', ' ')}</dt>
            <dd className="mt-1 break-words text-sm font-medium text-slate-900"><RecordFields value={nestedValue} /></dd>
          </div>
        ))}
      </dl>
    );
  }
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  return <span>{String(value)}</span>;
}

export default function AdminAuditLogPage() {
  const [draftSearch, setDraftSearch] = useState('');
  const [filters, setFilters] = useState({ search: '', action: '', entity: '', page: 1 });
  const [selectedLog, setSelectedLog] = useState(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearConfirmation, setClearConfirmation] = useState('');
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => (await client.get('/audit-logs', { params: filters })).data,
    placeholderData: (previous) => previous,
  });
  const clearMatchingLogs = useMutation({
    mutationFn: async () => (await client.delete('/audit-logs', {
      params: { search: filters.search, action: filters.action, entity: filters.entity },
      data: { confirmation: clearConfirmation },
    })).data,
    onSuccess: async () => {
      setClearDialogOpen(false);
      setClearConfirmation('');
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
  const { data: detail, isPending: detailPending, isError: detailError } = useQuery({
    queryKey: ['audit-log-detail', selectedLog?.id],
    queryFn: async () => (await client.get(`/audit-logs/${selectedLog.id}`)).data,
    enabled: Boolean(selectedLog),
  });

  useEffect(() => {
    if (!selectedLog) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSelectedLog(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedLog]);

  const submitSearch = (event) => {
    event.preventDefault();
    setFilters((current) => ({ ...current, search: draftSearch.trim(), page: 1 }));
  };
  const hasActiveFilters = Boolean(filters.search || filters.action || filters.entity);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <header className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#133d3b_0%,#176760_65%,#18877d_100%)] p-5 text-white shadow-xl shadow-teal-950/10 sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-24 -z-10 h-72 w-72 rounded-full border border-white/10" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-50"><Activity className="h-3.5 w-3.5" /> Admin workspace</span>
            <h1 className="mt-4 flex items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl"><Activity className="h-7 w-7 text-teal-100" /> Activity log</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-teal-50/80">A clear trail of queue, inventory, reservation, and QR verification actions across your health center.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs font-medium text-teal-50/70">Matching records</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{data?.total ?? '—'}</p>
          </div>
        </div>
      </header>

      <form onSubmit={submitSearch} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_220px_190px_auto]">
        <label className="sr-only" htmlFor="audit-search">Search log</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input id="audit-search" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Search actor, action, or record ID" className="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20" />
        </div>
        <label className="sr-only" htmlFor="audit-action">Filter by action</label>
        <select id="audit-action" value={filters.action} onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value, page: 1 }))} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm">
          <option value="">All actions</option>
          {actions.map((action) => <option key={action} value={action}>{action.replaceAll('.', ' · ').replaceAll('_', ' ')}</option>)}
        </select>
        <label className="sr-only" htmlFor="audit-entity">Filter by record type</label>
        <select id="audit-entity" value={filters.entity} onChange={(event) => setFilters((current) => ({ ...current, entity: event.target.value, page: 1 }))} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm">
          <option value="">All record types</option>
          {entities.map((entity) => <option key={entity} value={entity}>{entity.replaceAll('_', ' ')}</option>)}
        </select>
        <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"><Search className="h-4 w-4" /> Search</button>
      </form>

      {isError && <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"><span>Could not load the audit log.</span><button type="button" onClick={() => refetch()} className="min-h-10 rounded-lg border border-rose-300 px-3 font-semibold hover:bg-rose-100">Try again</button></div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
          <div><h2 className="font-bold text-slate-950">Recorded transactions</h2><p className="mt-0.5 text-xs text-slate-500">Select an entry to inspect its full record.</p></div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Newest first · 50/page</span>
            <button type="button" disabled={!hasActiveFilters || !data?.total || clearMatchingLogs.isPending} onClick={() => { setClearConfirmation(''); setClearDialogOpen(true); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40">
              <Trash2 className="h-4 w-4" /> Delete matching logs
            </button>
          </div>
        </div>
        {!hasActiveFilters && <p className="border-b border-slate-100 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-5">Select a filter or search for a specific set of logs before deleting. Unfiltered deletion is disabled.</p>}
        {isPending ? <p className="p-8 text-center text-sm text-slate-500">Loading activity…</p> : data?.data?.length ? (
          <ul className="divide-y divide-slate-100">
            {data.data.map((log) => (
              <li key={log.id}>
                <button type="button" onClick={() => setSelectedLog(log)} className="group grid w-full grid-cols-1 gap-2 px-4 py-4 text-left transition hover:bg-gradient-to-r hover:from-teal-50/80 hover:to-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 sm:grid-cols-[minmax(0,1fr)_190px] sm:gap-4 sm:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-900">{formatAction(log.action)}</span>
                      <span className="text-xs capitalize text-slate-500">{log.entity}{log.entity_id ? ` #{log.entity_id}` : ''}</span>
                      <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-teal-700" />
                    </div>
                    {log.metadata && <p className="mt-2 break-words text-sm text-slate-600">{Object.entries(log.metadata).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value)}`).join(' · ')}</p>}
                    <p className="mt-1 text-xs text-slate-500">{log.user?.name || 'System'}{log.user?.role ? ` · ${log.user.role}` : ''}</p>
                  </div>
                  <time className="text-xs text-slate-500 sm:text-right" dateTime={log.created_at}>{formatTimestamp(log.created_at)}</time>
                </button>
              </li>
            ))}
          </ul>
        ) : <div className="px-5 py-14 text-center"><Activity className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-semibold text-slate-900">No matching activity</p><p className="mt-1 text-sm text-slate-600">Try clearing one or more filters.</p></div>}
        {data?.last_page > 1 && (
          <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-5">
            <span className="text-xs text-slate-500">Page {data.current_page} of {data.last_page}</span>
            <div className="flex gap-2">
              <button type="button" disabled={data.current_page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button>
              <button type="button" disabled={data.current_page >= data.last_page} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button>
            </div>
          </footer>
        )}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setSelectedLog(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="activity-detail-title" onClick={(event) => event.stopPropagation()} className="max-h-[min(85dvh,760px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <header className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-teal-800">Transaction detail · #{selectedLog.id}</p>
                <h2 id="activity-detail-title" className="mt-1 text-xl font-bold capitalize text-slate-950">{formatAction(selectedLog.action)}</h2>
              </div>
              <button type="button" aria-label="Close transaction details" onClick={() => setSelectedLog(null)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button>
            </header>
            <div className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><UserRound className="h-5 w-5 text-teal-700" /><div><p className="text-xs text-slate-500">Recorded by</p><p className="font-semibold text-slate-900">{selectedLog.user?.name || 'System'}{selectedLog.user?.role ? ` · ${selectedLog.user.role}` : ''}</p></div></div>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><Clock3 className="h-5 w-5 text-teal-700" /><div><p className="text-xs text-slate-500">Recorded at</p><time className="font-semibold text-slate-900" dateTime={selectedLog.created_at}>{formatTimestamp(selectedLog.created_at)}</time></div></div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-900">Transaction metadata</h3>
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length ? (
                  <dl className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(selectedLog.metadata).map(([key, value]) => (
                      <div key={key} className="min-w-0 rounded-lg border border-slate-200 p-3">
                        <dt className="text-xs capitalize text-slate-500">{key.replaceAll('_', ' ')}</dt>
                        <dd className="mt-1 break-words text-sm font-medium text-slate-900">{typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No additional metadata was recorded.</p>}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-900">{selectedLog.entity.replaceAll('_', ' ')} record{selectedLog.entity_id ? ` #${selectedLog.entity_id}` : ''}</h3>
                {detailPending ? <p role="status" className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Loading linked record…</p>
                  : detailError ? <p role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800">Could not load the linked record. Transaction metadata is still available above.</p>
                    : detail?.record ? <div className="rounded-xl border border-slate-200 bg-white p-3"><RecordFields value={detail.record} /></div>
                      : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">The linked record is no longer available; its audit entry remains preserved.</p>}
              </div>
            </div>
          </section>
        </div>
      )}
      {clearDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => { if (!clearMatchingLogs.isPending) setClearDialogOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="clear-logs-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-lg space-y-4 rounded-2xl border border-rose-200 bg-white p-5 shadow-2xl sm:p-6">
            <div>
              <h2 id="clear-logs-title" className="text-lg font-bold text-slate-950">Delete matching activity logs?</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">This permanently deletes <strong>{data?.total ?? 0}</strong> log entries matching the currently applied filters. Operational records such as reservations, queue tickets, and stock movements will not be deleted. This action cannot be undone.</p>
            </div>
            {clearMatchingLogs.isError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{clearMatchingLogs.error.response?.data?.message || 'Could not delete matching activity logs.'}</p>}
            <div>
              <label htmlFor="clear-logs-confirmation" className="block text-sm font-semibold text-slate-800">Type <span className="font-mono text-rose-700">DELETE MATCHING LOGS</span> to confirm</label>
              <input id="clear-logs-confirmation" value={clearConfirmation} onChange={(event) => setClearConfirmation(event.target.value)} autoComplete="off" className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" disabled={clearMatchingLogs.isPending} onClick={() => setClearDialogOpen(false)} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" disabled={clearConfirmation !== 'DELETE MATCHING LOGS' || clearMatchingLogs.isPending} onClick={() => clearMatchingLogs.mutate()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50">
                <Trash2 className="h-4 w-4" /> {clearMatchingLogs.isPending ? 'Deleting…' : `Delete ${data?.total ?? 0} matching logs`}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}