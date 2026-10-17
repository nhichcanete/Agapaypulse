import { useEffect, useState } from 'react';
import { analyticsApi } from '../services/api';

function AnalyticsDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    analyticsApi.getDashboard()
      .then((res) => setData(res.data))
      .catch((err) => console.error(err));
  }, []);

  if (!data) return <p className="text-center text-slate-500 py-12">Loading analytics...</p>;

  const stats = [
    { label: 'Patients Today', value: data.throughput.total_patients_today, color: 'teal',     },
    { label: 'Completed',      value: data.throughput.completed_today,      color: 'emerald',  },
    { label: 'Waiting',        value: data.throughput.waiting_now,          color: 'amber',    },
    { label: 'Avg Wait (min)', value: data.throughput.average_wait_minutes, color: 'rose',     },
  ];

  const colorMap = {
    teal:    { bg: 'bg-teal-50',    text: 'text-teal-700',    bar: 'bg-teal-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-500' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    bar: 'bg-rose-500' },
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-1.5 h-8 bg-teal-600 rounded-full"></div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Health Analytics Dashboard</h2>
          <p className="text-xs text-slate-500">Live throughput and demographic insights</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`rounded-xl p-5 ${colorMap[s.color].bg} border border-slate-100`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-600">{s.label}</p>
                <span className="text-lg opacity-60">{s.icon}</span>
              </div>
              <p className={`text-3xl font-bold ${colorMap[s.color].text}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {data.demographics.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
              Demographic Ratios
            </h3>
            <div className="space-y-2.5">
              {data.demographics.map((d) => {
                const pct = data.throughput.total_patients_today > 0
                  ? (d.count / data.throughput.total_patients_today) * 100
                  : 0;
                return (
                  <div key={d.priority_tag} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-slate-600">{d.priority_tag}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <span className="w-10 text-sm font-semibold text-slate-700 text-right">{d.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Critical Low-Stock Alerts
          </h3>
          {data.low_stock_alerts.length === 0 ? (
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4">
              All medicines are sufficiently stocked.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.low_stock_alerts.map((med) => (
                <li
                  key={med.id}
                  className="flex justify-between bg-rose-50 border border-rose-200 rounded-lg px-4 py-3"
                >
                  <span className="text-sm text-rose-800 font-medium">{med.medicine_name}</span>
                  <span className="text-sm font-bold text-rose-600">
                    {med.stock_quantity} {med.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export default AnalyticsDashboard;