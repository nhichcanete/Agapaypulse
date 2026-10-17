import React, { useEffect, useState } from 'react';
import client from '../../api/client';
import { usePolling } from '../../hooks/usePolling';
import { Activity, ArrowRight, Clock3, Pill, Users } from 'lucide-react';

export default function LiveDisplay() {
  const [data, setData] = useState({ now_serving: [], upcoming: [], announcements: [] });
  const [currentTime, setCurrentTime] = useState('');
  const [connectionState, setConnectionState] = useState('connecting');

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleTimeString());
    updateTime();
    const interval = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(interval);
  }, []);

  usePolling(async () => {
    try {
      const res = await client.get('/display');
      setData(res.data);
      setConnectionState('live');
    } catch {
      setConnectionState('offline');
    }
  }, 3000);

  const ticketsForStream = (stream) => data.now_serving.filter((ticket) => ticket.stream === stream);
  const upcomingForStream = (stream) => data.upcoming.filter((ticket) => ticket.stream === stream).slice(0, 4);

  const renderStream = (stream, title, destination, Icon) => {
    const activeTickets = ticketsForStream(stream);
    const upcomingTickets = upcomingForStream(stream);

    return (
      <section key={stream} className="min-w-0 overflow-hidden rounded-2xl border border-[#d5e2dd] bg-white shadow-[0_12px_35px_rgba(21,51,50,0.08)]">
        <header className="flex items-center justify-between gap-3 border-b border-[#e5eeea] bg-[#f8fbf9] px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#dff0e9] text-[#087e79]"><Icon className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase text-[#087e79]">Stream {stream}</p>
              <h2 className="truncate text-base font-bold text-[#153332] sm:text-lg">{title}</h2>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#60716f] ring-1 ring-[#d9e3df]">{destination}</span>
        </header>

        <div className="space-y-4 p-4 sm:p-6">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-[#60716f]"><Activity className="h-4 w-4 text-[#087e79]" /> Now serving</div>
            {activeTickets.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {activeTickets.map((ticket) => (
                  <article key={ticket.id} className="relative min-w-0 overflow-hidden rounded-xl bg-[#103b39] p-4 text-white sm:p-5">
                    <span className="absolute inset-y-0 left-0 w-1 bg-[#53c6b7]" />
                    <div className="flex items-center justify-between gap-2 pl-2">
                      <span className="text-xs font-semibold uppercase text-teal-100">Desk {ticket.desk_number}</span>
                      {ticket.severity === 'Emergency' && <span className="rounded-full bg-rose-500 px-2 py-1 text-[10px] font-bold uppercase">Priority</span>}
                    </div>
                    <p className="mt-2 break-all pl-2 font-mono text-5xl font-extrabold leading-none text-white sm:text-6xl">{ticket.queue_number}</p>
                    <p className="mt-3 flex items-center gap-2 pl-2 text-sm text-teal-100"><ArrowRight className="h-4 w-4" /> Please proceed to {destination.toLowerCase()}.</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-24 items-center gap-3 rounded-xl border border-dashed border-[#cbdad4] bg-[#f8fbf9] px-4 text-sm text-[#60716f]">
                <Clock3 className="h-5 w-5 shrink-0 text-[#839793]" /> No ticket is being called right now.
              </div>
            )}
          </div>

          <div className="border-t border-[#e5eeea] pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase text-[#60716f]">Coming up</h3>
              <span className="text-xs text-[#839793]">{upcomingTickets.length} next</span>
            </div>
            {upcomingTickets.length ? (
              <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {upcomingTickets.map((ticket, index) => (
                  <li key={ticket.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-[#f3f7f5] px-3 py-2.5">
                    <span className="text-xs font-semibold text-[#839793]">{index + 1}</span>
                    <span className="truncate font-mono text-sm font-bold text-[#153332]">{ticket.queue_number}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-[#839793]">No confirmed tickets waiting.</p>}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-dvh bg-[#f3f7f5] text-[#153332]">
      <header className="bg-[#103b39] text-white shadow-sm">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-teal-100/30 bg-teal-100/10 text-teal-200"><Activity className="h-6 w-6" /></span>
            <div>
              <p className="text-[11px] font-bold uppercase text-teal-200">Barangay Health Station</p>
              <h1 className="text-xl font-extrabold sm:text-2xl">AgapayPulse <span className="font-medium text-teal-100/80">Live Board</span></h1>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold">
              <span className={`h-2 w-2 rounded-full ${connectionState === 'live' ? 'bg-emerald-300' : connectionState === 'offline' ? 'bg-rose-300' : 'bg-amber-300'}`} />
              {connectionState === 'live' ? 'Live updates' : connectionState === 'offline' ? 'Reconnecting' : 'Connecting'}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-teal-200">Local time</p>
              <p className="font-mono text-base font-bold tabular-nums sm:text-lg">{currentTime}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-80px)] max-w-[1600px] flex-col px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase text-[#087e79]">Public queue information</p>
            <p className="mt-1 text-sm text-[#60716f]">Please keep your ticket ready and follow the desk or window call.</p>
          </div>
          <span className="hidden items-center gap-1.5 text-xs text-[#60716f] sm:flex"><Users className="h-4 w-4" /> Ticket numbers only</span>
        </div>

        <div className="grid flex-1 grid-cols-1 content-start gap-4 xl:grid-cols-2">
          {renderStream('A', 'Consultation', 'Consultation desk', Users)}
          {renderStream('B', 'Express pharmacy', 'Pharmacy window', Pill)}
        </div>

        <aside aria-live="polite" className="mt-5 rounded-xl border border-[#c8ded4] bg-[#e3f1ea] px-4 py-4 sm:mt-7 sm:flex sm:items-start sm:gap-4 sm:px-5">
          <span className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase text-[#075e5a] sm:mb-0"><Activity className="h-4 w-4" /> Announcements</span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-[#153332]">
            {data.announcements.length ? data.announcements.map((message, index) => <p key={`${index}-${message}`} className="break-words">{message}</p>) : <p className="text-[#60716f]">No active announcements.</p>}
          </div>
        </aside>
        <footer className="pt-4 text-center text-[11px] text-[#839793]">AgapayPulse · Barangay Health Station</footer>
      </main>
    </div>
  );
}