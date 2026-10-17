import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search, UserRoundSearch } from 'lucide-react';
import client from '../../api/client';

const initialFilters = {
  search: '',
  priority: 'all',
  age_group: 'all',
  queue_status: 'all',
  severity: 'all',
};

const statusLabels = {
  pre_registered: 'Awaiting arrival',
  waiting: 'Waiting',
  called: 'Called',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

function PriorityBadge({ resident }) {
  if (resident.priority_label === 'None') {
    return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Regular</span>;
  }

  const ageBased = resident.age !== null && resident.age >= 60;
  const verified = resident.priority_verified;
  const pending = resident.priority_document_status === 'pending';

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${verified
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-amber-100 text-amber-800'}`}>
      {resident.priority_label}{ageBased ? ' · age-based' : verified ? ' · verified' : pending ? ' · under review' : ' · not verified'}
    </span>
  );
}

export default function ResidentDirectory() {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['resident-directory', filters, page],
    queryFn: async () => (await client.get('/resident-directory', {
      params: { ...filters, page },
    })).data,
    placeholderData: (previousData) => previousData,
  });
  const residents = query.data?.data || [];
  const meta = query.data?.meta;
  const updateFilter = (name, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [name]: value }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-2xl bg-[linear-gradient(120deg,#123b39_0%,#145e59_62%,#16847a_100%)] p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-center gap-3">
          <UserRoundSearch className="h-7 w-7 text-teal-100" />
          <div>
            <h2 className="text-2xl font-extrabold">Resident Directory</h2>
            <p className="mt-1 text-sm text-teal-50/85">Registered resident accounts with today’s queue status.</p>
          </div>
        </div>
      </header>

      <section aria-label="Directory filters" className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <div className="relative min-w-0 sm:col-span-2">
          <label className="sr-only" htmlFor="resident-directory-search">Search residents or tickets</label>
          <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400" />
          <input
            id="resident-directory-search"
            type="search"
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            placeholder="Name or ticket"
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm leading-5 outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
          />
        </div>

        <label className="text-xs font-semibold text-slate-600">
          Priority
          <select value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900">
            <option value="all">All</option>
            <option value="priority">Priority residents</option>
            <option value="regular">Regular residents</option>
          </select>
        </label>

        <label className="text-xs font-semibold text-slate-600">
          Age group
          <select value={filters.age_group} onChange={(event) => updateFilter('age_group', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900">
            <option value="all">All ages</option>
            <option value="under_18">Under 18</option>
            <option value="18_59">18–59</option>
            <option value="60_plus">60 and older</option>
            <option value="unknown">Age not provided</option>
          </select>
        </label>

        <label className="text-xs font-semibold text-slate-600">
          Today’s queue
          <select value={filters.queue_status} onChange={(event) => updateFilter('queue_status', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900">
            <option value="all">Any status</option>
            <option value="none">No ticket today</option>
            <option value="pre_registered">Awaiting arrival</option>
            <option value="waiting">Waiting</option>
            <option value="called">Called</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-show</option>
          </select>
        </label>

        <label className="text-xs font-semibold text-slate-600">
          Triage severity
          <select value={filters.severity} onChange={(event) => updateFilter('severity', event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900">
            <option value="all">All levels</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Emergency">Emergency</option>
          </select>
        </label>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-6">
          <h3 className="font-bold text-slate-900">Registered residents</h3>
          <span className="text-xs font-medium text-slate-500">
            {meta ? `${meta.total} total · page ${meta.current_page} of ${meta.last_page}` : 'Loading'}
          </span>
        </div>

        {query.isPending ? (
          <p role="status" className="p-10 text-center text-sm text-slate-600">Loading registered residents…</p>
        ) : query.isError ? (
          <p role="alert" className="p-6 text-sm text-rose-800">{query.error?.response?.data?.message || 'Could not load the resident directory.'}</p>
        ) : residents.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-600">No residents match these filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-bold">Resident</th>
                    <th scope="col" className="px-5 py-3 font-bold">Age</th>
                    <th scope="col" className="px-5 py-3 font-bold">Priority</th>
                    <th scope="col" className="px-5 py-3 font-bold">Today’s queue</th>
                    <th scope="col" className="px-5 py-3 font-bold">Severity</th>
                    <th scope="col" className="px-5 py-3 font-bold">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {residents.map((resident) => (
                    <tr key={resident.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-semibold text-slate-900">{resident.name}</td>
                      <td className="px-5 py-4 text-slate-700">{resident.age == null ? 'Not provided' : `${resident.age} years`}</td>
                      <td className="px-5 py-4"><PriorityBadge resident={resident} /></td>
                      <td className="px-5 py-4 text-slate-700">
                        {resident.queue
                          ? <span>{resident.queue.ticket} · {statusLabels[resident.queue.status] || resident.queue.status}</span>
                          : <span className="text-slate-400">No ticket today</span>}
                      </td>
                      <td className="px-5 py-4">
                        {resident.queue
                          ? <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${resident.queue.severity === 'Emergency' ? 'bg-rose-100 text-rose-800' : resident.queue.severity === 'High' ? 'bg-orange-100 text-orange-800' : resident.queue.severity === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{resident.queue.severity}</span>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(resident.registered_at))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6">
              <p className="text-xs text-slate-500">Resident account details are limited to operational information.</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!meta || meta.current_page <= 1 || query.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  type="button"
                  disabled={!meta || meta.current_page >= meta.last_page || query.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
