import React, { useState, useEffect } from 'react';
import client from '../../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast, { Toaster } from 'react-hot-toast';
import { Users, Pill, Activity, Download, ShieldCheck, Plus, X } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementText, setAnnouncementText] = useState('');

  useEffect(() => {
    Promise.all([client.get('/analytics/overview'), client.get('/announcements')])
      .then(([overview, announcementList]) => {
        setData(overview.data);
        setAnnouncements(announcementList.data);
      })
      .catch(() => toast.error('Unable to load analytics or announcements.'))
      .finally(() => setLoading(false));
  }, []);

  const downloadCsv = async (path, filename) => {
    try {
      const response = await client.get(path, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('The export could not be downloaded.');
    }
  };

  const handleCreateAnnouncement = async (event) => {
    event.preventDefault();
    try {
      const response = await client.post('/announcements', { message: announcementText });
      setAnnouncements((items) => [response.data, ...items]);
      setAnnouncementText('');
      toast.success('Announcement published to the live board.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not publish announcement.');
    }
  };

  const handleDeactivateAnnouncement = async (announcement) => {
    try {
      await client.delete(`/announcements/${announcement.id}`);
      setAnnouncements((items) => items.map((item) => item.id === announcement.id ? { ...item, active: false } : item));
      toast.success('Announcement removed from the live board.');
    } catch {
      toast.error('Could not remove this announcement.');
    }
  };

  const chartData = data?.surveillance
    ? Object.entries(data.surveillance).map(([name, count]) => ({
      disease: {
        'URTI / Cough / Cold': 'URTI',
        'Hypertension / BP': 'Blood pressure',
        'Fever / Flu': 'Fever',
        'Dengue / Rash': 'Dengue',
        'Diabetes / Glucose': 'Diabetes',
      }[name] || name,
      fullName: name,
      count,
    }))
    : [];

  return (
    <div className="space-y-6">
      <Toaster />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Health Center Operational Analytics & UHC Hub</h2>
          <p className="text-xs text-slate-500">Real-time triage metrics, epidemiological surveillance, and PhilHealth Konsulta exports</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => downloadCsv('/analytics/export-philhealth', 'AgapayPulse_Konsulta.csv')} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800">
            <Download className="h-4 w-4" /> PhilHealth CSV
          </button>
          <button type="button" onClick={() => downloadCsv('/analytics/export-fhsis', 'AgapayPulse_FHSIS.csv')} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" /> FHSIS CSV
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-teal-100 text-teal-700 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Patients Today</span>
            <p className="text-2xl font-extrabold text-slate-900">{data?.metrics?.total_today ?? 0}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-xl"><Pill className="h-6 w-6" /></div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Low-stock items</span>
            <p className="text-2xl font-extrabold text-slate-900">{data?.metrics?.low_stock ?? 0}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Visits Completed</span>
            <p className="text-2xl font-extrabold text-slate-900">{data?.metrics?.completed_today ?? 0}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
            <Pill className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Express Claims Released</span>
            <p className="text-2xl font-extrabold text-slate-900">{data?.metrics?.claims_today ?? 0}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Priority Patient Ratio</span>
            <p className="text-2xl font-extrabold text-slate-900">{data?.metrics?.priority_pct ?? 0}%</p>
          </div>
        </div>
      </div>

      {/* Disease Surveillance Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Epidemiological Disease Surveillance Tracker (30-Day Trends)
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="disease" stroke="#64748b" fontSize={10} interval={0} tickMargin={8} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || _label} />
              <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-950">Live-board announcements</h3>
            <p className="mt-1 text-sm text-slate-600">Publish service notices visible on the public queue display.</p>
          </div>
        </div>
        <form onSubmit={handleCreateAnnouncement} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="announcement-message">Announcement message</label>
          <input id="announcement-message" required maxLength={1000} value={announcementText} onChange={(event) => setAnnouncementText(event.target.value)} placeholder="e.g. Vaccination clinic closes at 3:00 PM today" className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm" />
          <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"><Plus className="h-4 w-4" /> Publish</button>
        </form>
        <ul className="mt-4 divide-y divide-slate-100">
          {announcements.map((announcement) => (
            <li key={announcement.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className={`break-words text-sm ${announcement.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{announcement.message}</p>
                <span className="mt-1 block text-xs text-slate-500">{announcement.active ? 'On live board' : 'Archived'}</span>
              </div>
              {announcement.active && <button type="button" onClick={() => handleDeactivateAnnouncement(announcement)} aria-label="Remove announcement from live board" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700"><X className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
        {loading && <p className="text-sm text-slate-500">Loading admin data…</p>}
      </section>
    </div>
  );
}